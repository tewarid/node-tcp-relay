var util = require("util");
var EventEmitter = require("events").EventEmitter;
var net = require("net");
var tls = require('tls');

module.exports = {
    createRelayClient: function createRelayClient(host, port, relayHost,
    relayPort, numConn) {
        return new RelayClient(host, port, relayHost, relayPort, numConn);
    }
};

function RelayClient(host, port, relayHost, relayPort, options) {
    this.host = host;
    this.port = port;
    this.relayHost = relayHost;
    this.relayPort = relayPort;
    if (typeof options === 'number') {
        this.numConn = options;
    } else {
        this.numConn = options.numConn;
        this.options = options;
    }
    this.clients = [];

    for (var i = 0; i < this.numConn; i++) {
        this.clients[this.clients.length] =
            this.createClient(host, port, relayHost, relayPort, options);
    }
}

RelayClient.prototype.createClient = function(host, port, relayHost,
relayPort, options) {
    var relayClient = this;
    var client = new Client(host, port, relayHost, relayPort, options);
    client.on("pair", function() {
        relayClient.clients[relayClient.clients.length] =
            relayClient.createClient(host, port, relayHost, relayPort, options);
    });
    client.on("close", function() {
        var i = relayClient.clients.indexOf(client);
        if (i != -1) {
            relayClient.clients.splice(i, 1);
        }
        setTimeout(function() {
            if (relayClient.endCalled) return;
            relayClient.clients[relayClient.clients.length] =
                relayClient.createClient(host, port, relayHost, relayPort,
                options);
        }, 5000);
    });
    return client;
};

RelayClient.prototype.end = function() {
    this.endCalled = true;
    for (var i = 0; i < this.clients.length; i++) {
        this.clients[i].removeAllListeners();
        this.clients[i].relaySocket.destroy();
    }
};

util.inherits(Client, EventEmitter);

function Client(host, port, relayHost, relayPort, options) {
    this.options = options;
    this.serviceSocket = undefined;
    this.bufferData = true;
    this.buffer = [];

    var client = this;
    if (client.options.tls) {
        client.relaySocket = tls.connect(relayPort, relayHost, {
            rejectUnauthorized: client.options.rejectUnauthorized
        }, function() {
            client.authorize();
        });
    } else {
        client.relaySocket = new net.Socket();
        client.relaySocket.connect(relayPort, relayHost, function() {
            client.authorize();
        });
    }
    client.relaySocket.on("data", function(data) {
        if (client.serviceSocket == undefined) {
            client.emit("pair");
            client.createServiceSocket(host, port);
        }
        if (client.bufferData) {
            client.buffer[client.buffer.length] = data;
        } else {
            client.serviceSocket.write(data);
        }
    });
    client.relaySocket.on("close", function(hadError) {
        if (client.serviceSocket != undefined) {
            client.serviceSocket.destroy();
        } else {
            client.emit("close");
        }
    });
    client.relaySocket.on("error", function(error) {
    });
}

Client.prototype.authorize = function() {
    if (this.options.secret) {
        this.relaySocket.write(this.options.secret);
    }
};

Client.prototype.createServiceSocket = function(host, port) {
    var client = this;
    client.serviceSocket = new net.Socket();
    client.serviceSocket.connect(port, host, function() {
        client.bufferData = false;
        if (client.buffer.length > 0) {
            for (var i = 0; i < client.buffer.length; i++) {
                client.serviceSocket.write(client.buffer[i]);
            }
            client.buffer.length = 0;
        }
    });
    client.serviceSocket.on("data", function(data) {
        try {
            client.relaySocket.write(data);
        } catch (ex) {
        }
    });
    client.serviceSocket.on("error", function(hadError) {
        client.relaySocket.end();
    });
};
