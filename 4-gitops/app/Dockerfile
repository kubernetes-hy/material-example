FROM golang:1.15 AS build

WORKDIR /usr/src/app

COPY . .

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build

FROM scratch

COPY --from=build /usr/src/app/hashgen /usr/src/app/hashgen

ENTRYPOINT [ "/usr/src/app/hashgen" ]