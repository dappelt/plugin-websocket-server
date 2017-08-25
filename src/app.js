'use strict'

const Koa = require('koa')
const route = require('koa-route')
const websockify = require('koa-websocket')

const Plugin = require('ilp-plugin-payment-channel-framework')

const wsOptions = { maxPayload: 64 * 1024 }

class App {
  constructor () {
    this.store = {}
    this.plugin = new Plugin({
      'maxBalance': '1000000000',
      'prefix': 'g.eur.mytrustline.',
      'token': 'shared_secret', // shared secret between server and client
      'rpcUri': 'https://wallet2.example/api/peers/rpc', // RPC endpoint of the trustline peer
      'info': {
        'currencyScale': 9,
        'currencyCode': 'EUR',
        'prefix': 'g.eur.mytrustline.',
        'connectors': ['g.eur.mytrustline.server']
      },
      _store: {
        get: (k) => this.store[k],
        put: (k, v) => { this.store[k] = v },
        del: (k) => delete this.store[k]
      }
    })

    this.plugin.registerSideProtocolHandler('echo-protocol', (message) => {
      return message.custom['echo-protocol'] + ' back'
    })

    this.koaApp = websockify(new Koa(), wsOptions)
    this._setupWebSocketRoute()
  }

  start () {
    this.koaApp.listen(3000)
    console.log('Listening on 3000')
  }

  _setupWebSocketRoute () {
    // TODO: WebSocket Authentication
    // app.ws.use(passport.initialize())
    this.koaApp.ws.use(route.all('/peers/rpc', (ctx) => {
      // TODO: Check Auth
      try {
        this.plugin.addSocket(ctx.websocket)
      } catch (err) { console.log(err) }
    }))
  }
}

module.exports = App
