READ: book.kubebuilder.io 

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

Write reconciler function `controllers/countdown_controller.go`

Make `make`

deploy CRD's to your cluster `make install`

to test your controller `make run` and then apply a Countdown `kubectl apply -f manifests/countdown.yaml`

