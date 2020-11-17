/*


Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package controllers

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"math"
	"strconv"
	"time"

	"github.com/go-logr/logr"
	"github.com/prometheus/common/log"
	kbatch "k8s.io/api/batch/v1"
	core "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	stabledwkv1 "stable.dwk/api/v1"
)

// CountdownReconciler reconciles a Countdown object
type CountdownReconciler struct {
	client.Client
	Log    logr.Logger
	Scheme *runtime.Scheme
}

var (
	jobOwnerKey = ".metadata.controller"
	apiGVStr    = stabledwkv1.GroupVersion.String()
)

func randomBase16String(l int) string {
	buff := make([]byte, int(math.Round(float64(l)/2)))
	rand.Read(buff)
	str := hex.EncodeToString(buff)
	return str[:l] // strip 1 extra character we get from odd length results
}
func constructJobForCountdown(countdown *stabledwkv1.Countdown, r *CountdownReconciler, length int) (*kbatch.Job, error) {
	// We want job names for a given nominal start time to have a deterministic name to avoid the same job being created twice
	name := fmt.Sprintf(countdown.Name)
	job := &kbatch.Job{
		ObjectMeta: metav1.ObjectMeta{
			Labels:      make(map[string]string),
			Annotations: make(map[string]string),
			Name:        name + "-job-" + strconv.Itoa(length) + "-" + randomBase16String(6),
			Namespace:   countdown.Namespace,
		},
		Spec: kbatch.JobSpec{
			Template: core.PodTemplateSpec{
				Spec: core.PodSpec{
					Containers: []core.Container{
						{
							Name:  name + "-job-" + strconv.Itoa(length),
							Image: countdown.Spec.Image,
							Args:  []string{strconv.Itoa(length)},
						},
					},
					RestartPolicy: "Never",
				},
			},
		},
	}

	if err := ctrl.SetControllerReference(countdown, job, r.Scheme); err != nil {
		return nil, err
	}

	return job, nil
}

// +kubebuilder:rbac:groups=stable.dwk.stable.dwk,resources=countdowns,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=stable.dwk.stable.dwk,resources=countdowns/status,verbs=get;update;patch
// +kubebuilder:rbac:groups=batch,resources=jobs,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=batch,resources=jobs/status,verbs=get

// Reconcile reconciles Countdowns
// Doesn't really deal with manifest updates or deletions during runtime
// just to show you the general idea.
func (r *CountdownReconciler) Reconcile(req ctrl.Request) (ctrl.Result, error) {
	ctx := context.Background()
	_ = r.Log.WithValues("countdown", req.NamespacedName)

	var countdown stabledwkv1.Countdown
	if err := r.Get(ctx, req.NamespacedName, &countdown); err != nil {
		fmt.Println(err, "unable to fetch Countdown")
		// we'll ignore not-found errors, since they can't be fixed by an immediate
		// requeue (we'll need to wait for a new notification), and we can get them
		// on deleted requests.
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}
	var childJobs kbatch.JobList
	var activeJobs []*kbatch.Job
	var finishedJobs []*kbatch.Job

	if err := r.List(ctx, &childJobs, client.MatchingFields{jobOwnerKey: req.Name}); err != nil {
		log.Error(err, "unable to list child Jobs")
		return ctrl.Result{}, err
	}
	isJobFinished := func(job *kbatch.Job) (bool, kbatch.JobConditionType) {
		for _, c := range job.Status.Conditions {
			if (c.Type == kbatch.JobComplete || c.Type == kbatch.JobFailed) && c.Status == core.ConditionTrue {
				return true, c.Type
			}
		}

		return false, ""
	}

	// We just count how many countdowns are already done to determine which to run next.
	// should add extra steps to make sure it's not too early or late for robustness.

	for i, j := range childJobs.Items {

		_, finishedType := isJobFinished(&j)
		switch finishedType {
		case "": // ongoing
			activeJobs = append(activeJobs, &childJobs.Items[i])
		case kbatch.JobFailed:
			finishedJobs = append(finishedJobs, &childJobs.Items[i])
		case kbatch.JobComplete:
			finishedJobs = append(finishedJobs, &childJobs.Items[i])
		}

	}

	i := len(activeJobs) + len(finishedJobs)
	job, err := constructJobForCountdown(&countdown, r, countdown.Spec.Length-i)

	if i == countdown.Spec.Length {
		fmt.Println("We are done, nothing to reconcile")
		// we could add cleanup here
		// r.Delete(ctx, &countdown)
		return ctrl.Result{}, nil
	}
	if err != nil {
		fmt.Println(err, "unable to construct job from template")
		return ctrl.Result{}, err
	}
	// ...and create it on the cluster
	if err := r.Create(ctx, job); err != nil {
		fmt.Println(err, "unable to create Job for Countdown", "job")
		return ctrl.Result{}, err
	}

	fmt.Println("created Job for Countdown run", job.Name)

	// Requeue a reconciliation call after the delay given in spec.
	return ctrl.Result{RequeueAfter: time.Duration(countdown.Spec.Delay) * time.Millisecond}, nil
}

func (r *CountdownReconciler) SetupWithManager(mgr ctrl.Manager) error {
	if err := mgr.GetFieldIndexer().IndexField(&kbatch.Job{}, jobOwnerKey, func(rawObj runtime.Object) []string {
		// grab the job object, extract the owner...
		job := rawObj.(*kbatch.Job)
		owner := metav1.GetControllerOf(job)
		if owner == nil {
			return nil
		}
		// ...make sure it's a Countdown...

		if owner.APIVersion != apiGVStr || owner.Kind != "Countdown" {
			return nil
		}

		// ...and if so, return it
		return []string{owner.Name}
	}); err != nil {
		return err
	}

	return ctrl.NewControllerManagedBy(mgr).
		For(&stabledwkv1.Countdown{}).
		Complete(r)
}
