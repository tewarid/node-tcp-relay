The relayc.js script is meant to be executed on a machine behind a NAT as follows

tcprelayc --host host --port port --relayHost host --relayPort port

Here, host is any server visible to the machine behind the NAT, it can also be localhost. port is the port of the service you want to expose through the relay. relayServer is the host or IP address of the server visible on the internet, and already executing the relays.js script. relayPort is the port where this script will connect with the relay server.

The relay client always maintains one unused connection with the relay server, which the server uses to relay data from the next internet client. As soon as the relay client detects data activity on that connection it establishes another connection.

The relays.js script is meant to be executed on the server visible on the internet as follows

tcprelays --relayPort port --servicePort port

Here, relayPort is the port where the server will listen for connections from the relay client. servicePort is the port where external clients can connect to the service exposed through the relay.

If you're using HTTP/S, use a reverse proxy such as http-proxy, between the relay client and the local server

var httpProxy = require('http-proxy');
httpProxy.createProxyServer({target:'http://host:port'}).listen(port);
