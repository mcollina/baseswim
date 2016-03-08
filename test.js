'use strict'

const test = require('tap').test
const baseswim = require('.')
const Swim = require('swim')
const request = require('request')

let nextPort = 10001

function nextId () {
  let result = '127.0.0.1:' + nextPort++
  return result
}

function bootstrap (t, opts, cb) {
  if (typeof opts === 'function') {
    cb = opts
    opts = null
  }
  opts = opts || {}
  opts.joinTimeout = 20
  let instance = baseswim(nextId(), opts)
  t.tearDown(instance.leave.bind(instance))

  instance.on('error', (err) => {
    console.log('instance error', instance.whoami(), err.message)
  })

  instance.on('up', () => {
    let swim = new Swim({
      local: {
        host: nextId()
      }
    })
    swim.bootstrap([instance.whoami()], (err) => {
      t.error(err)
      t.tearDown(swim.leave.bind(swim))
      t.deepEqual(instance.members(), [{
        meta: undefined,
        host: swim.whoami(),
        state: 0,
        incarnation: 0
      }], 'parent members match')
      t.deepEqual(swim.members(), [{
        meta: undefined,
        host: instance.whoami(),
        state: 0,
        incarnation: 0
      }], 'child members match')

      if (cb) {
        cb(instance, swim)
      }
    })
  })
}

test('comes up', (t) => {
  t.plan(3)
  bootstrap(t)
})

test('comes up using automatic address lookup', (t) => {
  t.plan(3)
  let instance = baseswim({ port: nextPort++ })
  t.tearDown(instance.leave.bind(instance))

  instance.on('error', (err) => {
    console.log('instance error', instance.whoami(), err.message)
  })

  instance.on('up', () => {
    let swim = new Swim({
      local: {
        host: '127.0.0.1:' + nextPort++
      }
    })
    swim.bootstrap([instance.whoami()], (err) => {
      t.error(err)
      t.tearDown(swim.leave.bind(swim))
      t.deepEqual(instance.members(), [{
        meta: undefined,
        host: swim.whoami(),
        state: 0,
        incarnation: 0
      }], 'parent members match')
      t.deepEqual(swim.members(), [{
        meta: undefined,
        host: instance.whoami(),
        state: 0,
        incarnation: 0
      }], 'child members match')
    })
  })
})

test('exposes /members over http', (t) => {
  t.plan(5)
  bootstrap(t, {
    http: {
      port: 3000
    }
  }, function (instance, swim) {
    request('http://localhost:3000/members', (err, res, body) => {
      t.error(err)
      const expected = {
        members: [{
          host: instance.whoami(),
          state: 0,
          incarnation: 0
        }, {
          host: swim.whoami(),
          state: 0,
          incarnation: 0
        }]
      }
      t.deepEqual(JSON.parse(body), expected, 'members matches')
    })
  })
})

test('exposes /join over HTTP', (t) => {
  t.plan(6)
  bootstrap(t, {
    http: {
      port: 3000
    }
  }, function (instance, swim) {
    let secondId = nextId()
    let second = baseswim(secondId, {
      http: 3001,
      joinTimeout: 20
    })
    t.tearDown(second.leave.bind(second))
    second.on('up', () => {
      request.post({
        url: 'http://localhost:3001/join',
        body: instance.whoami()
      }, (err, res, body) => {
        t.error(err)
        request('http://localhost:3000/members', (err, res, body) => {
          t.error(err)
          const expected = {
            members: [{
              host: instance.whoami(),
              state: 0,
              incarnation: 0
            }, {
              host: swim.whoami(),
              state: 0,
              incarnation: 0
            }, {
              host: secondId,
              state: 0,
              incarnation: 0
            }]
          }
          t.deepEqual(JSON.parse(body), expected, 'members matches')
        })
      })
    })
  })
})

test('peerUp/peerDown events from the cluster perspective', { timeout: 5000 }, (t) => {
  t.plan(6)
  bootstrap(t, {
    joinTimeout: 20
  }, (instance, swim) => {
    let secondId = nextId()
    let second = baseswim(secondId, {
      joinTimeout: 200,
      base: [instance.whoami()]
    })
    t.tearDown(second.leave.bind(second))
    second.on('up', () => {
      second.leave()
    })
    instance.on('peerUp', (peer) => {
      t.equal(peer.host, second.whoami())
      instance.on('peerSuspect', (peer) => {
        t.equal(peer.host, second.whoami())
      })
      instance.on('peerDown', (peer) => {
        t.equal(peer.host, second.whoami())
      })
    })
  })
})

test('peerUp/peerDown events from the new node perspective', { timeout: 5000 }, (t) => {
  t.plan(6)
  bootstrap(t, {
    joinTimeout: 20
  }, (instance, swim) => {
    let secondId = nextId()
    let second = baseswim(secondId, {
      joinTimeout: 200,
      base: [instance.whoami()]
    })
    t.tearDown(second.leave.bind(second))
    second.once('peerUp', (peer) => {
      t.equal(peer.host, swim.whoami())
      second.once('peerUp', (peer) => {
        t.equal(peer.host, instance.whoami())
        swim.leave()
        second.on('peerSuspect', (peer) => {
          t.equal(peer.host, swim.whoami())
        })
        second.on('peerDown', (peer) => {
          t.equal(peer.host, swim.whoami())
        })
      })
    })
  })
})
