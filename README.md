# node-tcp-relay

These TCP relay scripts can be used to expose any TCP/IP service running behind a NAT. This includes services that use HTTP, SSH, and so on.

To install from  <a href="https://www.npmjs.com/package/node-tcp-relay">npm</a>
```bash
sudo npm install -g node-tcp-relay
```

## Command Line Interface

The relay server script is meant to be executed on a server visible on the internet as follows

```bash
tcprelays --relayPort 10080 --servicePort 10081 [--secret key] [--tls] [--pfx file] [--passphrase passphrase]
```

`relayPort` is the port where the relay server will listen for incoming connections from the relay client. `servicePort` is the port where external clients can connect to the service exposed through the relay.

Use `secret` option to specify a shared secret key used to authorize relay client.

Use `tls` option to enable TLS with relay client. Use `pfx` option to specify PFX file containing private key of server. Use `passphrase` to specify password used to protect private key.

The relay client script is meant to be executed on a machine behind a NAT as follows

```bash
tcprelayc --host host --port 10080 --relayHost host --relayPort port [--numConn count] [--secret key] [--tls]
```

`host` is any server visible to the machine behind the NAT, it can also be `localhost`. `port` is the port of the service you want to expose through the relay.

`relayServer` is the host or IP address of the server visible on the internet executing the relay server script. `relayPort` is the port where this script will connect with relay server.

`numConn` is the number of unused connections relay client maintains with the relay server. As soon as it detects data activity on a socket, relay client establishes another connection.

Use `secret` option to specify a shared secret key used to authorize relay client. Use `tls` option to enable secure communication with relay server, using TLS.

If you're relaying HTTP(S), use a reverse proxy such as http-proxy, between the relay client and the local service e.g.
```javascript
var httpProxy = require('http-proxy');
httpProxy.createProxyServer({target:'http://host:port'}).listen(port);
```

## Programming Interface

Create and start a relay server thus

```javascript
var relayServer = require("node-tcp-relay");
var newRelayServer = relayServer.createRelayServer(10080, 10081);
```

End relay server

```javascript
newRelayServer.end();    
```

Create and start a relay client thus

```javascript
var relayClient = require("node-tcp-relay")
var newRelayClient = relayClient.createRelayClient("hostname", 8080, "relayserver", 10080, 1);
```

End relay client

```javascript
newRelayClient.end();
```
