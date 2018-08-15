var util = require("util");
var EventEmitter = require("events").EventEmitter;
var net = require("net");
var tls = require('tls');
var fs = require('fs');

module.exports = {
    createRelayClient: createRelayClient
};

function createRelayClient(host, port, relayHost, relayPort, numConn) {
    var options;
    if (typeof numConn === "number") {
        options = {};
        options.numConn = numConn;
    } else {
        options = Object.assign(numConn);
        options.numConn = numConn.numConn;
    }
    options.host = host;
    options.port = port;
    options.relayHost = relayHost;
    options.relayPort = relayPort;
    options.relayTlsOptions = makeRelayTlsOptions(options);
    options.serviceTlsOptions = makeServiceTlsOptions(options);
    return new RelayClient(options);
}

function RelayClient(options) {
    this.options = options;
    this.clients = [];

    for (var i = 0; i < this.options.numConn; i++) {
        this.clients[this.clients.length] =
            this.createClient(options);
    }
}

RelayClient.prototype.createClient = function(options) {
    var relayClient = this;
    var client = new Client(options);
    client.on("pair", function() {
        relayClient.clients[relayClient.clients.length] =
            relayClient.createClient(options);
    });
    client.on("close", function() {
        var i = relayClient.clients.indexOf(client);
        if (i != -1) {
            relayClient.clients.splice(i, 1);
        }
        setTimeout(function() {
            if (relayClient.endCalled) return;
            relayClient.clients[relayClient.clients.length] =
                relayClient.createClient(options);
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

function Client(options) {
    this.options = options;
    this.serviceSocket = undefined;
    this.bufferData = true;
    this.buffer = [];

    var client = this;
    client.connect();
    client.relaySocket.on("data", function(data) {
        client.receiveData(data);
    });
    client.relaySocket.on("close", function(hadError) {
        client.close();
    });
    client.relaySocket.on("error", function(error) {
    });
}

function makeRelayTlsOptions(options) {
    var tlsOptions = {
        rejectUnauthorized: options.rejectUnauthorized,
        secureProtocol: "TLSv1_2_method",
        pfx: fs.readFileSync(options.pfx),
        passphrase: options.passphrase,
    };
    if (options.caFile) {
        tlsOptions.ca = fs.readFileSync(options.caFile);
    }
    return tlsOptions;
}

function makeServiceTlsOptions(options) {
    var tlsOptions = {
        rejectUnauthorized: options.rejectUnauthorized,
        secureProtocol: "TLSv1_2_method"
    };
    return tlsOptions;
}

Client.prototype.connect = function() {
    var client = this;
    if (this.options.tls) {
        this.relaySocket = tls.connect(this.options.relayPort,
            this.options.relayHost, this.options.relayTlsOptions,
            function() {
                client.authorize();
            });
    } else {
        this.relaySocket = new net.Socket();
        this.relaySocket.connect(this.options.relayPort,
            this.options.relayHost,
            function() {
                client.authorize();
            });
    }
};

Client.prototype.receiveData = function(data) {
    if (this.serviceSocket == undefined) {
        this.emit("pair");
        this.createServiceSocket(this.options.host, this.options.port);
    }
    if (this.bufferData) {
        this.buffer[this.buffer.length] = data;
    } else {
        this.serviceSocket.write(data);
    }
};

Client.prototype.close = function() {
    if (this.serviceSocket != undefined) {
        this.serviceSocket.destroy();
    } else {
        this.emit("close");
    }
};

Client.prototype.createServiceSocket = function(host, port) {
    var client = this;
    if (this.options.tls === "both") {
        this.serviceSocket = tls.connect(port, host,
            this.options.serviceTlsOptions,
            function() {
                client.writeBuffer();
            });
    } else {
        this.serviceSocket = new net.Socket();
        this.serviceSocket.connect(port, host, function() {
            client.writeBuffer();
        });
    }
    this.serviceSocket.on("data", function(data) {
        try {
            client.relaySocket.write(data);
        } catch (ex) {
        }
    });
    this.serviceSocket.on("error", function(hadError) {
        client.relaySocket.end();
    });
};

Client.prototype.writeBuffer = function() {
    this.bufferData = false;
    if (this.buffer.length > 0) {
        for (var i = 0; i < this.buffer.length; i++) {
            this.serviceSocket.write(this.buffer[i]);
        }
        this.buffer.length = 0;
    }
};
