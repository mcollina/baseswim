#! /usr/bin/env node

'use strict'

const networkAddress = require('network-address')
const Swim = require('swim')
const assert = require('assert')
const inherits = require('util').inherits
const minimist = require('minimist')
const pino = require('pino')
const xtend = require('xtend')
const control = require('./lib/control')
const defaults = {
  joinTimeout: 5000,
  pingTimeout: 200, // increase the swim default 10 times
  pingReqTimeout: 600, // increase the swim default 10 times
  interval: 200 // double swim default
}

function BaseSwim (id, opts) {
  if (!(this instanceof BaseSwim)) {
    return new BaseSwim(id, opts)
  }

  if (typeof id === 'object') {
    opts = id
    id = null
  }

  opts = xtend(defaults, opts)

  // cannot use xtend because it is not recursive
  opts.local = opts.local || {}
  opts.base = opts.base || []

  // initialize the current host with the id
  opts.local.host = opts.local.host || id

  assert(opts.local.host, 'missing id or opts.local.host')

  Swim.call(this, opts)

  this.bootstrap(opts.base, (err) => {
    if (err) {
      this.emit('error', err)
      return
    }
    if (opts.http) {
      if (typeof opts.http === 'number') {
        opts.http = { port: parseInt(opts.http) }
      }
      this._http = control(this)
      this._http.listen(opts.http.port || 3000, (err) => {
        if (err) {
          this.emit('error', err)
          return
        }
        this.emit('httpReady', opts.http.port)
        this.emit('up')
      })
    } else {
      this.emit('up')
    }
  })

  // hacky fix to have stable events
  let set = new Set()

  this.on(Swim.EventType.Change, (event) => {
    switch (event.state) {
      case 0:
        if (!set.has(event.host)) {
          set.add(event.host)
          this.emit('peerUp', event)
        }
        break
    }
  })

  this.on(Swim.EventType.Update, (event) => {
    switch (event.state) {
      case 0:
        if (!set.has(event.host)) {
          set.add(event.host)
          this.emit('peerUp', event)
        }
        break
      case 1:
        this.emit('peerSuspect', event)
        break
      case 2:
        set.delete(event.host)
        this.emit('peerDown', event)
        break
    }
  })
}

inherits(BaseSwim, Swim)

BaseSwim.EventType = Swim.EventType

BaseSwim.prototype.leave = function () {
  if (this._http) {
    this._http.close()
  }
  Swim.prototype.leave.call(this)
}

module.exports = BaseSwim

function start () {
  const logger = pino()
  const info = logger.info
  const argv = minimist(process.argv.slice(2), {
    integer: ['port'],
    alias: {
      port: 'p',
      host: 'h',
      help: 'H',
      joinTimeout: 'j'
    },
    default: {
      port: 7799,
      host: networkAddress()
    }
  })

  if (argv.help) {
    console.error('Usage:', process.argv[1], '[--port 7799] [--host YOURIP] base1 base2')
    process.exit(1)
  }

  argv.base = argv._

  let baseswim = new BaseSwim(argv.host + ':' + argv.port, argv)
  baseswim.on('httpReady', (port) => {
    info('http server listening on port %d', port)
  })
  baseswim.on('peerUp', (peer) => {
    info('peer online %s', peer.host)
  })
  baseswim.on('peerSuspect', (peer) => {
    info('peer suspect %s', peer.host)
  })
  baseswim.on('peerDown', (peer) => {
    info('peer offline %s', peer.host)
  })
}

if (require.main === module) {
  start()
}
