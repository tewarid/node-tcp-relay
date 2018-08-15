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
    }
};

function RelayServer(relayPort, internetPort, options) {
    this.options = options || {};
    this.relayPort = relayPort;
    this.internetPort = internetPort;
    this.createListeners();
    var server = this;
    this.relayListener.on("new", function(client) {
        server.internetListener.pair(server.relayListener, client);
    });
    this.internetListener.on("new", function(client) {
        server.relayListener.pair(server.internetListener, client);
    });
}

RelayServer.prototype.createListeners = function() {
    this.relayListener = new Listener(this.relayPort, {
        hostname: this.options.hostname,
        secret: this.options.secret,
        bufferData: this.options.secret ? true : false,
        tls: this.options.tls !== false ? true : false,
        pfx: this.options.pfx,
        passphrase: this.options.passphrase
    });
    this.internetListener = new Listener(this.internetPort, {
        hostname: this.options.hostname,
        bufferData: true,
        timeout: 20000,
        tls: this.options.tls === "both" ? true : false,
        pfx: this.options.pfx,
        passphrase: this.options.passphrase
    });
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

    var listener = this;
    if (listener.options.tls === true) {
        var tlsOptions = {
            pfx: fs.readFileSync(listener.options.pfx),
            passphrase: listener.options.passphrase,
            secureProtocol: "TLSv1_2_method"
        };
        this.server = tls.createServer(tlsOptions, function(socket) {
            listener.createClient(socket);
        });
    } else {
        this.server = net.createServer(function(socket) {
            listener.createClient(socket);
        });
    }
    this.server.listen(port, options.hostname);
}

Listener.prototype.createClient = function(socket) {
    var client = new Client(socket, {
        secret: this.options.secret,
        bufferData: this.options.bufferData,
        timeout: this.options.timeout
    });
    var listener = this;
    client.on("close", function() {
        listener.handleClose(client);
    });
    if (listener.options.secret) {
        client.on("authorized", function() {
            listener.emit("new", client);
        });
    } else {
        listener.emit("new", client);
    }
};

Listener.prototype.handleClose = function(client) {
    var i = this.pending.indexOf(client);
    if (i != -1) {
        this.pending.splice(i, 1);
    } else {
        i = this.active.indexOf(client);
        if (i != -1) {
            this.active.splice(i, 1);
        }
    }
};

Listener.prototype.end = function() {
    this.server.close();
    destroyAllSockets(this.pending);
    destroyAllSockets(this.active);
    this.server.unref();
};

function destroyAllSockets(arr) {
    for (var i = 0; i < arr.length; i++) {
        arr[i].socket.destroy();
    }
}

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
    socket.on("data", function(data) {
        client.receiveData(data);
    });
    socket.on("close", function(hadError) {
        client.handleClose(hadError);
    });
    socket.on("error", function(err) {
      client.emit("close");
    });
}

Client.prototype.receiveData = function(data) {
    if (this.options.bufferData) {
        this.buffer[this.buffer.length] = data;
        this.authorize();
        return;
    }
    try {
        this.pairedSocket.write(data);
    } catch (ex) {
    }
};

Client.prototype.handleClose = function(hadError) {
    if (this.pairedSocket != undefined) {
        this.pairedSocket.destroy();
    }
    this.emit("close");
};

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
