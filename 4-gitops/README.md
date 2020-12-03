New structure since github actions can't have paths and paths-ignore at the same time. Otherwise we could've done the following:

```
    paths:
      - '4-gitops-app/**'
    paths-ignore:
      - '4-gitops-app/manifests'
```