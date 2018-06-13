const { RelayServer, Listener, Client } = require('../../').server

class CustomClient extends Client {
  constructor (socket, options) {
    super(socket, options)

    this.on('close', this.onClose.bind(this))
    this.on('authorized', this.onAuthorized.bind(this))
    this.socket.on('data', this.onSocketData.bind(this))
    this.socket.on('close', this.onSocketClose.bind(this))
  }

  onClose () { console.log('server:client:onSocketData') }
  onAuthorized () { console.log('server:client:onAuthorized') }
  onSocketData (data) { console.log('server:client:onSocketData') }
  onSocketClose (hadError) { console.log('server:client:onSocketClose', { hadError }) }
}

class CustomListener extends Listener {
  constructor (port, options) {
    super(port, options)

    this.on('new', (client) => console.log('server:listener:onNew'))
  }

  createClient (socket) {
    return super.createClient(socket, CustomClient)
  }
}

class CustomRelayServer extends RelayServer {
  constructor(relayPort, internetPort, options = {}) {
    super(relayPort, internetPort, options)

    this.relayListener.on('new', (client) => console.log('server:relayListener:onNew'))
    this.internetListener.on('new', (client) => console.log('server:internetListener:onNew'))
  }

  createInternetListener () {
    return super.createInternetListener(CustomListener)
  }

  createRelayListener () {
    return super.createRelayListener(CustomListener)
  }
}

module.exports = CustomRelayServer