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
	"fmt"
	"strconv"
	"time"

	"github.com/go-logr/logr"
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
)

func constructJobForCountdown(countdown *stabledwkv1.Countdown, r *CountdownReconciler, length int) (*kbatch.Job, error) {
	// We want job names for a given nominal start time to have a deterministic name to avoid the same job being created twice
	name := fmt.Sprintf(countdown.Name)
	job := &kbatch.Job{
		ObjectMeta: metav1.ObjectMeta{
			Labels:      make(map[string]string),
			Annotations: make(map[string]string),
			Name:        name + "-job" + strconv.Itoa(length),
			Namespace:   countdown.Namespace,
		},
		Spec: kbatch.JobSpec{
			Template: core.PodTemplateSpec{
				Spec: core.PodSpec{
					Containers: []core.Container{
						{
							Name:  name + "-job" + strconv.Itoa(length),
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

	ticker := time.NewTicker(time.Duration(countdown.Spec.Delay) * time.Millisecond)
	i := 0
	for range ticker.C {
		length := countdown.Spec.Length
		if i > length {
			break
		}

		job, err := constructJobForCountdown(&countdown, r, countdown.Spec.Length-i)
		i = i + 1
		if err != nil {
			fmt.Println(err, "unable to construct job from template")
			// don't bother requeuing until we get a change to the spec
			return ctrl.Result{}, err
		}
		// ...and create it on the cluster
		if err := r.Create(ctx, job); err != nil {
			fmt.Println(err, "unable to create Job for Countdown", "job", job)
			return ctrl.Result{}, err
		}
		fmt.Println("created Job for Countdown run", "job", job)

	}
	r.Client.Delete(ctx, &countdown)
	return ctrl.Result{}, nil

}

func (r *CountdownReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		For(&stabledwkv1.Countdown{}).
		Complete(r)
}
