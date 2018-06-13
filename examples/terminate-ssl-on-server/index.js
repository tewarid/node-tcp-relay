const fs = require('fs')
const http = require('http')
const tls = require('tls')

const { RelayServer, Listener } = require('../../').server
const relayClient = require('../../')

const demoOptions = {
  relayPort: 10080,
  internetPort: 10081,
  webserverPort: 10020,
  host: 'localhost'
}

const tlsOptions = {
  key: fs.readFileSync('self-signed-certs/server-key.pem'),
  cert: fs.readFileSync('self-signed-certs/server-crt.pem'),
  ca: fs.readFileSync('self-signed-certs/ca-crt.pem')
}

class CustomListener extends Listener {
  constructor (port, options) {
    super(port, options)
  }

  /**
   * Overload server creation to terminate TLS on internetListener.
   *
   * @return {tls.Server}
   */
  createServer () {
    return tls.createServer(tlsOptions, (socket) => {
      this.createClient(socket)
    })
  }

}

class CustomRelayServer extends RelayServer {
  constructor(relayPort, internetPort, options = {}) {
    super(relayPort, internetPort, options)
  }

  /**
   * Overload createInternetListener to use custom listener class.
   *
   * @return {CustomListener}
   */
  createInternetListener () {
    return super.createInternetListener(CustomListener)
  }
}

function main() {
  http.createServer((req, res)  => {
    res.setHeader('X-Hello', 'Hi there')
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=UTF-8' })
    res.end('Hello World!')
  }).listen(demoOptions.webserverPort)

  const relayServer = new CustomRelayServer(
    demoOptions.relayPort, demoOptions.internetPort
  )

  const newRelayClient = relayClient.createRelayClient(
    demoOptions.host,
    demoOptions.webserverPort,
    demoOptions.host,
    demoOptions.relayPort,
    1
  )

  console.log(`
    HTTP webserver, relayClient and custom relayServer (with TLS termination) created.

    Test with:
      curl https://${demoOptions.host}:${demoOptions.internetPort} -vvv --insecure
  `)
}

main()