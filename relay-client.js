var util = require("util");
var EventEmitter = require("events").EventEmitter;
var net = require("net");

module.exports = {
    createRelayClient: function createRelayClient(host, port, relayHost, relayPort, numConn) {
        return new RelayClient(host, port, relayHost, relayPort, numConn);
    }
}

function RelayClient(host, port, relayHost, relayPort, numConn) {
    this.host = host;
    this.port = port;
    this.relayHost = relayHost;
    this.relayPort = relayPort;
    this.numConn = numConn;
    this.clients = new Array();

    if (this.numConn == undefined) {
        this.numConn = 1;
    }

    for (var i = 0; i < this.numConn; i++) {
        this.clients[this.clients.length] = this.newClient(host, port, relayHost, relayPort);
    }    
}

RelayClient.prototype.newClient = function(host, port, relayHost, relayPort) {
    var relayClient = this;
    var client = new Client(host, port, relayHost, relayPort);
    client.on("inUse", function() {
        relayClient.clients[relayClient.clients.length] = 
            relayClient.newClient(host, port, relayHost, relayPort);
    });
    return client;
}

RelayClient.prototype.end = function () {
    for (var i = 0; i < this.clients.length; i++) {
        this.clients[i].relaySocket.end();
    }
}

util.inherits(Client, EventEmitter);

function Client(host, port, relayHost, relayPort) {
    this.serviceSocket = undefined;
    this.bufferData = true;
    this.buffer = new Array();
    
    var client = this;
    client.relaySocket = new net.Socket();
    client.relaySocket.connect(relayPort, relayHost, function () {
        client.relaySocket.on("data", function (data) {
            if (client.serviceSocket == undefined) {
                client.emit("inUse");
                client.createServiceSocket(host, port);
            }
            if (client.bufferData) {
                client.buffer[client.buffer.length] = data;
            } else {
                client.serviceSocket.write(data);
            }
        });
        client.relaySocket.on("close", function (had_error) {
            if (client.serviceSocket != undefined) {
                client.serviceSocket.destroy();
            }
        });
    });
}

Client.prototype.createServiceSocket = function (host, port) {
    var client = this;
    client.serviceSocket = new net.Socket();
    client.serviceSocket.connect(port, host, function () {
        client.bufferData = false;
        if (client.buffer.length > 0) {
            for (var i = 0; i < client.buffer.length; i++) {
                client.serviceSocket.write(client.buffer[i]);
            }
            client.buffer.length = 0;
        }
        client.serviceSocket.on("data", function (data) {
            try {
                client.relaySocket.write(data);
            } catch (ex) {
            }
        });
    });
    client.serviceSocket.on("error", function (had_error) {
        client.relaySocket.end();
    });
}