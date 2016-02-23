'use strict'

const http = require('http')
const concat = require('concat-stream')

function control (swim) {
  return http.createServer(handle)

  function handle (req, res) {
    if (req.url === '/members') {
      members(req, res)
    } else if (req.url === '/join' && req.method === 'POST') {
      join(req, res)
    } else {
      res.statusCode = 404
      res.end('not found\n')
    }
  }

  function members (req, res) {
    const members = swim.members()
    members.unshift(swim.membership.local.data())
    res.writeHead(200, {
      'Content-Type': 'application/json'
    })
    res.write(JSON.stringify({ members }, null, 2))
    res.end('\n')
  }

  function join (req, res) {
    req.pipe(concat((peer) => {
      peer = peer.toString()
      swim.join([peer], (err) => {
        if (err) {
          res.statusCode = 400
          res.end(err.message)
          return
        }
        res.statusCode = 200
        res.end()
      })
    })).on('err', (err) => {
      res.statusCode = 500
      res.end(err.message)
    })
  }
}

module.exports = control
