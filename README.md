# node-tcp-relay [![Codacy Badge](https://app.codacy.com/project/badge/Grade/fdbbca1d689d4b13b5a22c5765f41c8e)](https://www.codacy.com/gh/tewarid/node-tcp-relay/dashboard?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=tewarid/node-tcp-relay&amp;utm_campaign=Badge_Grade) [![Maintainability](https://api.codeclimate.com/v1/badges/4e63f2f80369103db673/maintainability)](https://codeclimate.com/github/tewarid/node-tcp-relay/maintainability)

This TCP relay/reverse proxy can be used to expose any TCP/IP service running behind a NAT. This includes services that use HTTP and SSH.

To install from  <a href="https://www.npmjs.com/package/node-tcp-relay">npm</a>

```bash
sudo npm install -g node-tcp-relay
```

## Command Line Interface

The relay server is meant to be executed on a server visible on the internet, as follows

```bash
tcprelays --relayPort 10080 --servicePort 10081 [--hostname [IP]] [--tls [both]] [--pfx file] [--passphrase passphrase] [--auth] [--caFile file]
```

`relayPort` is the port where the relay server will listen for incoming connections from the relay client. `servicePort` is the port where internet clients can connect to the service exposed through the relay. Optionally, `hostname` specifies the IP address to listen at. Node.js listens on unspecified IPv6 address `::` by default.

`tls` option enables secure communication with relay client using TLS. If followed by `both`, TLS is also enabled on the service port. `pfx` option specifies a private key file used to establish TLS. `passphrase` specifies password used to protect private key. Relay server authenticates relay client by requesting its certificate when `auth` option is specified. Use `caFile` option to specify CA certificates used to validate client certificate.

The relay client is meant to be executed on a machine behind a NAT, as follows

```bash
tcprelayc --host host --port 10080 --relayHost host --relayPort port [--numConn count] [--tls [both]] [--rejectUnauthorized] [--caFile file] [--pfx file] [--passphrase value]
```

`host` is any server visible to the machine behind the NAT. `port` is the port of the service you want to expose through the relay.

`relayServer` is the host name or IP address of the server visible on the internet executing the relay server. `relayPort` is the relay server port where the client will connect.

`numConn` is the number of unused connections relay client maintains with the server. As soon as it detects data activity on a socket, it establishes another connection. Servicing internet clients that don't transfer any data may lead to denial of service.

`tls` enables secure TLS communication with relay server. If followed by `both`, TLS is also used with server behind the NAT. `rejectUnauthorized` enables checking for valid server certificate. Custom CA file can be specified using the `caFile` option. Use `pfx` option to specify certificate used to authenticate relay client at relay server.

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

* [ssh -R](https://www.ssh.com/ssh/tunneling/example#remote-forwarding)
* VPN
