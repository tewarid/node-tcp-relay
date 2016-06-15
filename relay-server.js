var net = require("net");

function uniqueKey(socket) {
    var key = socket.remoteAddress + ':' + socket.remotePort;
    return key;
}

function RelayServer(relayPort, internetPort) {
    this.relayPort = relayPort;
    this.internetPort = internetPort;
    this.availableSockets = {};
    this.socketPair = {};
    this.pendingSockets = {};

    this.relay = this.createRelayClientListener(relayPort);
    this.server = this.createInternetClientListener(internetPort);
}

RelayServer.prototype.addAvailableSocket = function (socket) {
    this.availableSockets[uniqueKey(socket)] = socket;
}

RelayServer.prototype.nextAvailableSocket = function () {
    var key = Object.keys(this.availableSockets)[0];
    var socket = this.availableSockets[key];
    delete this.availableSockets[key];
    return socket;
}

RelayServer.prototype.removeFromAvailableSockets = function(socket) {
    var found = false;
    var key = uniqueKey(socket);
    var o = this.availableSockets[key];
    if (o != undefined) {
        delete this.availableSockets[key];
        found = true;
    }
    return found;
}

RelayServer.prototype.addSocketPair = function (socket1, socket2) {
    this.socketPair[uniqueKey(socket1)] = socket2;
    this.socketPair[uniqueKey(socket2)] = socket1;
}

RelayServer.prototype.getSocketPair = function (socket) {
    return this.socketPair[uniqueKey(socket)];
}

RelayServer.prototype.deleteSocketPair = function (socket) {
    delete this.socketPair[uniqueKey(socket)];
}

RelayServer.prototype.appendToPendingSocket = function (socket, data) {
    var key = uniqueKey(socket);
    var o = this.pendingSockets[key];
    if (o == undefined) {
        o = {};
        o.socket = socket;
        o.buffers = new Array();
        this.pendingSockets[key] = o;
    }
    o.buffers[o.buffers.length] = data;
}

RelayServer.prototype.deletePendingSocket = function (socket) {
    var found = false;
    var key = uniqueKey(socket);
    var o = this.pendingSockets[key];
    if (o != undefined) {
        delete this.pendingSockets[key];
        found = true;
    }
    return found;
}

RelayServer.prototype.processPending = function (socket) {
    var processed = false;
    
    var key = Object.keys(this.pendingSockets)[0];
    var o = this.pendingSockets[key];
    if (o != undefined) {
        this.addSocketPair(socket, o.socket);
        console.info("processing pending client...")
        if (o.buffers.length > 0) {
            for (var i = 0; i < o.buffers.length; i++) {
                socket.write(o.buffers[i]);
            }
        }
        delete this.pendingSockets[key];
        processed = true;
    }
    return processed;
}

RelayServer.prototype.createRelayClientListener = function (port) {
    var relayServer = this;

    var relay = net.createServer(function (socket) {
        
        if (!relayServer.processPending(socket)) {
            console.info("adding to available relay sockets");
            relayServer.addAvailableSocket(socket);                        
        }
        
        socket.on("data", function (data) {
            var clientSocket = relayServer.getSocketPair(socket);
            if (clientSocket == undefined) {
                console.info("client socket not found, discarding data");
                return;
            }
            try {
                clientSocket.write(data);
            } catch (ex) {
                console.info(ex);
            }
        });
        
        socket.on("close", function (had_error) {
            console.info("relay socket closed");

            if (relayServer.removeFromAvailableSockets(socket)) {
                console.info("  removed from available relay sockets");
            } else {
                var clientSocket = relayServer.getSocketPair(socket);
                if (clientSocket == undefined) {
                    console.info("  client socket not found");
                } else {
                    clientSocket.end();
                    relayServer.deleteSocketPair(clientSocket);
                }
            }
            relayServer.deleteSocketPair(socket);
        });
    });
    relay.listen(port);
    return relay;
}

RelayServer.prototype.createInternetClientListener = function (port) {
    var relayServer = this;

    var server = net.createServer(function (socket) {
        
        console.info("client socket established");
        
        var relaySocket = relayServer.nextAvailableSocket();
        if (relaySocket) {
            relayServer.addSocketPair(socket, relaySocket);
        } else {
            console.info("  no available relay socket, buffering...");
        }

        socket.on("data", function (data) {
            var relaySocket = relayServer.getSocketPair(socket);
            if (relaySocket == undefined) {
                relayServer.appendToPendingSocket(socket, data);
                return;
            }
            try {
                relaySocket.write(data);
            } catch (ex) {
                console.info(ex);
            }
        });
        
        socket.on("close", function (had_error) {
            console.info("client socket closed");
            var relaySocket = relayServer.getSocketPair(socket);
            if (relaySocket == undefined) {
                if (!relayServer.deletePendingSocket(socket)) {
                    console.info("  relay socket not found");
                } else {
                    relayServer.deleteSocketPair(socket);                    
                }
            } else {
                relaySocket.end();
                relayServer.deleteSocketPair(relaySocket);
            }
            relayServer.deleteSocketPair(socket);            
        });
    });
    server.listen(port);
    return server;
}

RelayServer.prototype.end = function() {
    console.log("Terminating relay server")
    this.relay.close();
    this.server.close();
    for (var key in this.socketPair) {
        this.socketPair[key].end();
    }
    for (var key in this.availableSockets) {
        this.availableSockets[key].end();
    }
    for (var key in this.pendingSockets) {
        this.pendingSockets[key].end();
    }
}

exports.createRelayServer = function (relayPort, internetPort) {
    return new RelayServer(relayPort, internetPort);
}
