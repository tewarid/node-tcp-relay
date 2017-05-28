var util = require("util");
var EventEmitter = require("events").EventEmitter;
var net = require("net");
var crypto = require("crypto");

module.exports = {
    createRelayServer: function (relayPort, internetPort, options) {
        return new RelayServer(relayPort, internetPort, options);
    }
}

function RelayServer(relayPort, internetPort, options) {
    this.options = options || {};
    this.relayPort = relayPort;
    this.internetPort = internetPort;
    this.relayListener = new Listener(relayPort);
    this.internetListener = new Listener(internetPort, {bufferData: true});

    var server = this;
    this.relayListener.on("new", function (client) {
        server.internetListener.pair(server.relayListener, client);
    });
    this.internetListener.on("new", function (client) {
        server.relayListener.pair(server.internetListener, client);
    });
}

RelayServer.prototype.end = function() {
    this.relayListener.close();
    this.internetListener.close();
}

util.inherits(Listener, EventEmitter);

function Listener(port, options) {
    this.port = port;
    this.options = options || {};
    this.pending = new Array();
    this.active = new Array();

    var listener = this;
    this.server = net.createServer(function (socket) {
        var client = new Client(socket, {
            bufferData: listener.options.bufferData
        });
        client.on("close", function() {
            var i = listener.pending.indexOf(client);
            if (i != -1) {
                listener.pending.splice(i, 1);
            } else {
                i = listener.active.indexOf(client);
                if (i != -1)
                    listener.active.splice(i, 1);
            }
        });
        listener.emit("new", client);
    }).listen(port);
}

Listener.prototype.close = function() {
    for(var i = 0; i < this.pending.length; i++) {
        var client = this.pending[i];
        client.socket.destroy();
    }
    for (var i = 0; i < this.active.length; i++) {
        var client = this.active[i];
        client.socket.destroy();
    }
    this.server.close();
}

Listener.prototype.pair = function (other, client) {
    if (this.pending.length > 0) {
        var thisClient = this.pending[0];
        this.pending.splice(0, 1);
        client.pairedSocket = thisClient.socket;
        thisClient.pairedSocket = client.socket;
        this.active[this.active.length] = thisClient;
        other.active[other.active.length] = client;
        client.writeBufferedData();
        thisClient.writeBufferedData();
    } else {
        other.pending.push(client);
    }
}

util.inherits(Client, EventEmitter);

function Client(socket, options) {
    this.socket = socket;
    this.options = options || {};
    this.pairedSocket = undefined;
    
    var client = this;
    if (client.options.bufferData) {
        client.buffer = new Array();
        setTimeout(function () {
            if (options.bufferData && !client.pairedSocket) {
                client.socket.destroy();
                client.emit("close");
            }
        }, 20000);
    }
    client.socket.on("data", function (data) {
        if (client.options.bufferData) {
            client.buffer[client.buffer.length] = data;
            return;
        }
        try {
            client.pairedSocket.write(data);
        } catch (ex) {
        }
    });    
    socket.on("close", function (had_error) {
        if (client.pairedSocket != undefined) {
            client.pairedSocket.destroy();
        }
        client.emit("close");
    });
}

Client.prototype.writeBufferedData = function() {
    if (this.options.bufferData && this.buffer.length > 0) {
        try {
            for (var i = 0; i < this.buffer.length; i++) {
                this.pairedSocket.write(this.buffer[i]);
            }
        } catch (ex) {
        }
    }
    this.options.bufferData = false;
}