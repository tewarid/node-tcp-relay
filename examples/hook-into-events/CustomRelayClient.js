const { RelayClient, Client } = require('../../').client

class CustomClient extends Client {
  constructor (host, port, relayHost, relayPort, options) {
    super(host, port, relayHost, relayPort, options)

    this.on('pair', () => console.log('client:client:onPair'))
    this.on('close', () => console.log('client:client:onClose'))

    this.relaySocket.on('data', (data) => console.log('client:client:relaySocket:onData'))
    this.relaySocket.on('close', (hadError) => console.log('client:client:relaySocket:onClose', { hadError }))
    this.relaySocket.on('error', (error) => console.log('client:client:relaySocket:onClose', { error }))
  }

  createServiceSocket (host, port) {
    super.createServiceSocket(host, port)

    this.serviceSocket.on('data', (data) => console.log('client:client:serviceSocket:onData'))
    this.serviceSocket.on('error', (error) => console.log('client:client:serviceSocket:onError', { error }))
  }
}

class CustomRelayClient extends RelayClient {
  constructor(host, port, relayHost, relayPort, options = {}) {
    super(host, port, relayHost, relayPort, options)
 }

  createClient (host, port, relayHost, relayPort, options) {
    return super.createClient(
      host, port, relayHost, relayPort, options, CustomClient
    )
  }

}

module.exports = CustomRelayClient