The relays.js script is meant to be executed on the server visible on the internet as follows

tcprelays --relayPort port --servicePort port

relayPort is the port where the server will listen for incoming connections from the relay client. servicePort is the port where external clients can connect to the service exposed through the relay.

The relayc.js script is meant to be executed on a machine behind a NAT as follows

tcprelayc --host host --port port --relayHost host --relayPort port [--numConn count]

host is any server visible to the machine behind the NAT, it can also be localhost. port is the port of the service you want to expose through the relay. relayServer is the host or IP address of the server visible on the internet, and already executing the relays.js script. relayPort is the port where this script will connect with the relay server. numConn is the number of unused sockets it will maintain with the relay server. As soon as it detects data activity on a socket, it establishes another connection.

If you're using HTTP/S, use a reverse proxy such as http-proxy, between the relay client and the local server e.g.

var httpProxy = require('http-proxy');
httpProxy.createProxyServer({target:'http://host:port'}).listen(port);
