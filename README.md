# node-tcp-relay [![Codacy Badge](https://api.codacy.com/project/badge/Grade/afcfc0a48b6b408c9c193fb72776c831)](https://www.codacy.com/app/tewarid/node-tcp-relay?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=tewarid/node-tcp-relay&amp;utm_campaign=Badge_Grade)

This TCP relay/reverse proxy can be used to expose any TCP/IP service running behind a NAT. This includes services that use HTTP and SSH.

To install from  <a href="https://www.npmjs.com/package/node-tcp-relay">npm</a>
```bash
sudo npm install -g node-tcp-relay
```

## Command Line Interface

The relay server is meant to be executed on a server visible on the internet, as follows

```bash
tcprelays --relayPort 10080 --servicePort 10081 [--hostname [IP]] [--secret key] [--tls] [--pfx file] [--passphrase passphrase]
```

`relayPort` is the port where the relay server will listen for incoming connections from the relay client. `servicePort` is the port where internet clients can connect to the service exposed through the relay. Optionally, `hostname` specifies the IP address to listen at. Node.js listens on unspecified IPv6 address `::` by default.

`secret` specifies a shared secret key used to authorize relay client. `tls` option enables secure communication with relay client using TLS. `pfx` option specifies a private key file used to establish TLS. `passphrase` specifies password used to protect private key.

The relay client is meant to be executed on a machine behind a NAT, as follows

```bash
tcprelayc --host host --port 10080 --relayHost host --relayPort port [--numConn count] [--secret key] [--tls] [--rejectUnauthorized]
```

`host` is any server visible to the machine behind the NAT. `port` is the port of the service you want to expose through the relay.

`relayServer` is the host name or IP address of the server visible on the internet executing the relay server. `relayPort` is the relay server port where the client will connect.

`numConn` is the number of unused connections relay client maintains with the server. As soon as it detects data activity on a socket, it establishes another connection. Servicing internet clients that don't transfer any data may lead to denial of service.

`secret` specifies a shared secret key relay client sends to server for the purpose of authorization. `tls` enables secure TLS communication with server. `rejectUnauthorized` enables checking for valid server certificate.

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

## Alternatives

* ssh -R
* VPN