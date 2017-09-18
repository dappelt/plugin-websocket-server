'use strict'

const Koa = require('koa')
const route = require('koa-route')
const websockify = require('koa-websocket')

const PluginVirtual = require('ilp-plugin-payment-channel-framework')
const PluginRipple = require('ilp-plugin-xrp-paychan')

const wsOptions = { maxPayload: 64 * 1024 }

class App {
  constructor () {
    this.port = parseInt(process.env.PORT) || 3000

    this.plugin = _makePluginVirtual()
    // this.plugin = _makeXrpPayChanPlugin()
    this.koaApp = websockify(new Koa(), wsOptions)
    this._setupWebSocketRoute()
  }

  start () {
    this.koaApp.listen(this.port)
    console.log('Listening on ' + this.port)
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

function _makeXrpPayChanPlugin () {
  const store = {}
  return new PluginRipple({
    // This is the server that ripple-lib submits transactions to.  You can
    // configure this to point at the altnet or to point at the live net.
    server: 'wss://s.altnet.rippletest.net:51233',

    // Your ripple address and secret
    address: 'r33L6z6LMD8Lk39iEQhyXeSWqNN7pFVaM6',
    secret: 'ssyFYib1wv4tKrYfQEARxGREH6T3b',

    // The peer you want to start a payment channel with
    peerAddress: 'rhxcezvTxiANA3TkxBWpx923M5zQ4RZ9gJ',

    // secret for ed25519 secret key
    channelSecret: 'shh its a secret',

    // limit of how much can be owed in-flight to you at once before you stop
    // accepting more incoming transfers. (in XRP drops)
    maxInFlight: '5000000',

    // how much to fund your payment channel. (in XRP drops)
    channelAmount: '10000000',

    // RPC calls to the peer on the other side of the channel are sent to this
    // endpoint using HTTP.
    rpcUri: 'http://example.com/rpc',

    // store is used to keep local state, which is necessary because the plugin
    // works based on off-chain payment channel claims. `get`, `put`, and `del`
    // are asynchronous functions for accessing a key-value store. See
    // https://github.com/interledger/rfcs/blob/master/0004-ledger-plugin-interface/0004-ledger-plugin-interface.md#class-pluginoptions
    _store: {
      get: (k) => store[k],
      put: (k, v) => { store[k] = v },
      del: (k) => delete store[k]
    }
  })
}

function _makePluginVirtual () {
  const store = {}
  return new PluginVirtual({
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
      get: (k) => store[k],
      put: (k, v) => { store[k] = v },
      del: (k) => delete store[k]
    }
  })
}

module.exports = App
