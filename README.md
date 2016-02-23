# baseswim

A base swim node

## Install

```
npm i baseswim -g
```

or

```
docker pull matteocollina/baseswim
```

## Usage

```
baseswim [--http 3000] [--port 7799] [peers...]
```

Each peer is in the form of IP:PORT, like 127.0.0.1:7799

### with Docker

```
docker run -p 3000:3000 -p 7799:7799/udp -d matteocollina/baseswim --host `docker-machine ip default` --http 3000 
```

If you need to connect it to other peers pass any peer id at the end,
like for the normal usage.

## as a module

```js
'use strict'

const baseswim = require('baseswim')
const id = '127.0.0.1:7799' // replace your ip address

const swim = basewim(id, {
  http: 3000 // to enable the HTTP endpoints
})

swim.on('peerUp', (peer) => console.log(peer))
swim.on('peerDown', (peer) => console.log(peer))
```

The swim instance is the same of [swim-js](http://npm.im/swim).
See its README for the API.

## HTTP endpoints

If enabled by the `--http` flag, baseswim provides two HTTP endpoint to
control the base node.

### GET /members

Provides a list of the current members, output:

```
$ curl `docker-machine ip default`:3000/members
{
  "members": [
    {
      "host": "192.168.99.100:7799",
      "state": 0,
      "incarnation": 0
    }
  ]
}
```

### POST /join

Provides a list of the current members, output:

```
curl -X POST -d 'PEER' `docker-machine ip default`:3000/members
```

where PEER is an IP:PORT combination.

## Acknowledgements

baseswim is sponsored by [nearForm](http://nearform.com).

## License

MIT
