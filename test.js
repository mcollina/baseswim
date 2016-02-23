'use strict'

const test = require('tap').test
const baseswim = require('.')
const Swim = require('swim')
const request = require('request')

let nextPort = 10000

function nextId () {
  return '127.0.0.1:' + nextPort++
}

function bootstrap (t, opts, cb) {
  if (typeof opts === 'function') {
    cb = opts
    opts = null
  }
  var instance = baseswim(nextId(), opts)
  t.tearDown(instance.leave.bind(instance))

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

test('exposes http server', (t) => {
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
