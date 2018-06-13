const CustomRelayClient = require('./CustomRelayClient')
const CustomRelayServer = require('./CustomRelayServer')

const demoOptions = {
  relayPort: 10080,
  internetPort: 10081,
  webserverPort: 10020,
  host: 'localhost',
  numConn: 1
}

const createNewClient = () => {
  return new CustomRelayClient(
    demoOptions.host,
    demoOptions.webserverPort,
    demoOptions.host,
    demoOptions.relayPort,
    demoOptions.numConn
  )
}

function main() {
  // create dummy http server
  require('http').createServer((req, res)  => {
    res.setHeader('X-Hello', 'Hi there')
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=UTF-8' })
    res.end('Hello World!')
  }).listen(demoOptions.webserverPort)

  const relayServer = new CustomRelayServer(
    demoOptions.relayPort, demoOptions.internetPort
  )

  createNewClient()

  console.log(`
    HTTP webserver, custom relayClient and custom relayServer created.

    Test with:
      curl http://${demoOptions.host}:${demoOptions.internetPort} -vvv --insecure

    Create additional new clients with:
      node index.js new-client
  `)
}

if (process.argv[2] === 'new-client') {
  createNewClient()
} else {
  main()
}
