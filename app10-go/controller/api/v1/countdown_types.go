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

package v1

import (
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// EDIT THIS FILE!  THIS IS SCAFFOLDING FOR YOU TO OWN!
// NOTE: json tags are required.  Any new fields you add must have json tags for the fields to be serialized.

// CountdownSpec defines the desired state of Countdown
type CountdownSpec struct {
	// INSERT ADDITIONAL SPEC FIELDS - desired state of cluster
	// Important: Run "make" to regenerate code after modifying this file

	Length int    `json:"length,omitempty"`
	Delay  int    `json:"delay,omitempty"`
	Image  string `json:"image,omitempty"`
}

// CountdownStatus defines the observed state of Countdown
type CountdownStatus struct {
	// INSERT ADDITIONAL STATUS FIELD - define observed state of cluster
	// Important: Run "make" to regenerate code after modifying this file
	Active []corev1.ObjectReference `json:"active,omitempty"`
}

// +kubebuilder:object:root=true

// Countdown is the Schema for the countdowns API
type Countdown struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   CountdownSpec   `json:"spec,omitempty"`
	Status CountdownStatus `json:"status,omitempty"`
}

// +kubebuilder:object:root=true

// CountdownList contains a list of Countdown
type CountdownList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []Countdown `json:"items"`
}

func init() {
	SchemeBuilder.Register(&Countdown{}, &CountdownList{})
}
