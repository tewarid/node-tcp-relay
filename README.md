This code started its public life as a [post](https://delog.wordpress.com/2011/07/19/a-tcp-relay-mechanism-with-node-js/) on my blog several years back. Adding it to GitHub in case someone wants to for it and take it further.

The relayc.js is meant to be executed on a machine behind a NAT as follows

node relayc.js --sh localserver --sp localport --rh relayserver --rp relayport

Here, localserver is any server visible to the machine behind the NAT, it can also be localhost. localport is the port of the service you want to expose through the relay. relayserver is the host or IP address of the server visible on the internet, and already executing the relays.js script. relayport is the port where this script will connect with the server.

The relays.js script is meant to be executed on the server visible on the internet as follows

node relays.js --rp relayport --sp serverport

Here, relayport is the port where the server will listen for connections from the relay client. serverport is the port where external clients can connect to the service exposed through the relay.

