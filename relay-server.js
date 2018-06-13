var util = require("util");
var EventEmitter = require("events").EventEmitter;
var net = require("net");
var tls = require('tls');
var fs = require('fs');

module.exports = {
    createRelayServer: function(relayPort, internetPort, options) {
        if (options === undefined) {
            options = {
                tls: false,
                pfx: "cert.pfx",
                passphrase: "abcd"
            };
        }
        return new RelayServer(relayPort, internetPort, options);
    },
    RelayServer: RelayServer,
    Listener: Listener,
    Client: Client,
};

function RelayServer(relayPort, internetPort, options) {
    this.options = options || {};
    this.relayPort = relayPort;
    this.internetPort = internetPort;
    this.relayListener = this.createRelayListener();
    this.internetListener = this.createInternetListener();

    var server = this;
    this.relayListener.on("new", function(client) {
        server.internetListener.pair(server.relayListener, client);
    });
    this.internetListener.on("new", function(client) {
        server.relayListener.pair(server.internetListener, client);
    });
}

RelayServer.prototype.createRelayListener = function(ListenerClass) {
    ListenerClass = ListenerClass || Listener;
    return new ListenerClass(this.relayPort, {
        hostname: this.options.hostname,
        secret: this.options.secret,
        bufferData: this.options.secret ? true : false,
        pfx: this.options.pfx,
        passphrase: this.options.passphrase
    })
};

RelayServer.prototype.createInternetListener = function(ListenerClass) {
    ListenerClass = ListenerClass || Listener;
    return new ListenerClass(this.internetPort, {
        hostname: this.options.hostname,
        bufferData: true,
        timeout: 20000
    })
};

RelayServer.prototype.end = function() {
    this.relayListener.end();
    this.internetListener.end();
};

util.inherits(Listener, EventEmitter);

function Listener(port, options) {
    this.port = port;
    this.options = options || {};
    this.pending = [];
    this.active = [];

    this.server = this.createServer()
    this.server.listen(port, options.hostname);
}

Listener.prototype.createServer = function() {
    var listener = this;
    var server = null;

    if (listener.options.tls === true) {
        if (listener.options.pfx) {
            var tlsOptions = {
                pfx: fs.readFileSync(listener.options.pfx),
                passphrase: listener.options.passphrase
            };
            server = tls.createServer(tlsOptions, function(socket) {
                listener.createClient(socket);
            });
        }
    } else {
        server = net.createServer(function(socket) {
            listener.createClient(socket);
        });
    }
    return server
};


Listener.prototype.createClient = function(socket, ClientClass) {
    ClientClass = ClientClass || Client;

    var listener = this;
    var client = new ClientClass(socket, {
        secret: listener.options.secret,
        bufferData: listener.options.bufferData,
        timeout: listener.options.timeout
    });
    client.on("close", function() {
        var i = listener.pending.indexOf(client);
        if (i != -1) {
            listener.pending.splice(i, 1);
        } else {
            i = listener.active.indexOf(client);
            if (i != -1) {
                listener.active.splice(i, 1);
            }
        }
    });
    if (listener.options.secret) {
        client.on("authorized", function() {
            listener.emit("new", client);
        });
    } else {
        listener.emit("new", client);
    }
};

Listener.prototype.end = function() {
    this.server.close();
    for (var i = 0; i < this.pending.length; i++) {
        var client = this.pending[i];
        client.socket.destroy();
    }
    for (var i = 0; i < this.active.length; i++) {
        var client = this.active[i];
        client.socket.destroy();
    }
    this.server.unref();
};

Listener.prototype.pair = function(other, client) {
    if (this.pending.length > 0) {
        var thisClient = this.pending[0];
        this.pending.splice(0, 1);
        client.pairedSocket = thisClient.socket;
        thisClient.pairedSocket = client.socket;
        this.active[this.active.length] = thisClient;
        other.active[other.active.length] = client;
        client.writeBuffer();
        thisClient.writeBuffer();
    } else {
        other.pending.push(client);
    }
};

util.inherits(Client, EventEmitter);

function Client(socket, options) {
    this.socket = socket;
    this.options = options || {};
    if (options.bufferData) {
        this.buffer = [];
    }
    this.pairedSocket = undefined;
    this.timeout();

    var client = this;
    client.socket.on("data", function(data) {
        if (client.options.bufferData) {
            client.buffer[client.buffer.length] = data;
            client.authorize();
            return;
        }
        try {
            client.pairedSocket.write(data);
        } catch (ex) {
        }
    });
    socket.on("close", function(hadError) {
        if (client.pairedSocket != undefined) {
            client.pairedSocket.destroy();
        }
        client.emit("close");
    });
}

Client.prototype.timeout = function() {
    var client = this;
    if (!client.options.timeout) {
        return;
    }
    setTimeout(function() {
        if (client.options.bufferData) {
            client.socket.destroy();
            client.emit("close");
        }
    }, client.options.timeout);
};

Client.prototype.authorize = function() {
    var client = this;
    if (client.options.secret) {
        var keyLen = client.options.secret.length;
        if (client.buffer[0].length >= keyLen
            && client.buffer[0].toString(undefined, 0, keyLen)
            === client.options.secret) {
            client.buffer[0] = client.buffer[0].slice(keyLen);
            client.emit("authorized");
        } else {
            client.socket.destroy();
        }
    }
};

Client.prototype.writeBuffer = function() {
    if (this.options.bufferData && this.buffer.length > 0) {
        try {
            for (var i = 0; i < this.buffer.length; i++) {
                this.pairedSocket.write(this.buffer[i]);
            }
        } catch (ex) {
        }
        this.buffer.length = 0;
    }
    this.options.bufferData = false;
};
