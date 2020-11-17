**READ:** https://book.kubebuilder.io 

**TLDR:**
Install kubebuilder
```
./install.sh
```

initialize project
```
go mod init stable.dwk

kubebuilder init --domain stable.dwk
```

Create new API, CRD and Controller
```
kubebuilder create api --group stable.dwk --version v1 --kind Countdown
``` 
Congratulations, now you have a ton of boilerplate

Fill in CRD `controller/api/v1/countdown_types.go`

The controller watches relevant resources and when an event happens to them it calls the Reconcile function. In the reconcile function you write the actions the controller is supposed to do steer the resource to its' desired state.
https://godoc.org/github.com/kubernetes-sigs/controller-runtime/pkg/reconcile

Write reconciler function `controllers/countdown_controller.go`


Make `make`

deploy CRD's to your cluster `make install`

to test your controller `make run` and then apply a Countdown `kubectl apply -f manifests/countdown.yaml`

If its good deploy it
```
make docker-build docker-push IMG=sasumaki/dwk-app10:sha-666420
```

```
kubectl apply -f ./manifests/
```
