package main

import (
	"github.com/google/uuid"
	"fmt"
	"time"
)

func main() {
	for {
		randomenough := uuid.New().String()[0:6]
		fmt.Println(randomenough)
		time.Sleep(5 * time.Second)
	}
}