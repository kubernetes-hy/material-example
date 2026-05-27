Fetcher

```
START
  connect to NATS server
  subscribe to processed_data:
    on message:
      decode package id
      remove that id from pending package list

  initialize pending package list with ids 0..999

  LOOP forever
    WHILE pending package list is not empty
      pick random package id from pending list
      wait until at least one mapper is ready:
        subscribe once to mapper_status
        publish mapper_status = "anyone_listening"
        when mapper_status == "im_listening":
          unsubscribe and continue
      build payload:
        index = chosen id
        data = getUsers(index) from mock API
      publish payload to mapper_data
    print "done, restarting"
    restart loop
END
```

Mapper

```
START
  connect to NATS server

  subscribe to mapper_status:
    if not currently busy and message == "anyone_listening":
      publish mapper_status = "im_listening"

  mark self ready:
    subscribe to mapper_data with queue group "mapper.workers"
    publish mapper_status = "im_listening"

  on mapper_data message:
    mark busy
    unsubscribe current mapper_data subscription (process one package at a time)
    parse payload { index, data }

    process payload:
      wait random time (simulate heavy work)
      transform each person into:
        { id: uuid, name: firstName + " " + lastName }

    publish transformed payload to saver_data
    mark ready again (resubscribe + publish "im_listening")
END
```

saver

```
START
  connect to NATS server

  subscribe to saver_data with queue group "saver.workers"
  on saver_data message:
    parse payload { index, data }
    log received package info
    (placeholder: save data somewhere)
    publish processed_data = index

  keep running
END
```
