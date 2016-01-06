#!/usr/bin/env node
var argv = require("optimist")
    .usage('Usage: $0 --relayPort [port] --servicePort [port]')
    .demand(['relayPort', 'servicePort'])
    .argv;

console.info(argv);

var net = require("net");

function uniqueKey(socket) {
    var key = socket.remoteAddress + ':' + socket.remotePort;
    return key;
}

var availableSockets = {};

function addAvailableSocket(socket) {
    availableSockets[uniqueKey(socket)] = socket;
}

function nextAvailableSocket() {
    var key = Object.keys(availableSockets)[0];
    var socket = availableSockets[key];
    delete availableSockets[key];
    return socket;
}

function removeFromAvailableSockets(socket) {
    var o = availableSockets[uniqueKey(socket)];
    delete availableSockets[uniqueKey(socket)];
    return o;
}

var socketPair = {};

function addSocketPair(socket1, socket2) {
    socketPair[uniqueKey(socket1)] = socket2;
    socketPair[uniqueKey(socket2)] = socket1;
}

function getSocketPair(socket) {
    return socketPair[uniqueKey(socket)];
}

function deleteSocketPair(socket) {
    delete socketPair[uniqueKey(socket)];
}

var pendingSockets = {};

function appendToPendingSocket(socket, data) {
    var key = uniqueKey(socket);
    var o = pendingSockets[key];
    if (o == undefined) {
        o = {};
        o.socket = socket;
        o.buffers = new Array();
        pendingSockets[key] = o;
    }
    o.buffers[o.buffers.length] = data;
}

function deletePendingSocket(socket) {
    var found = false;
    var key = uniqueKey(socket);
    var o = pendingSockets[key];
    if (o != undefined) {
        delete pendingSockets[key];
        found = true;
    }
    return found;
}

function processPending(socket) {
    var processed = false;
    
    var key = Object.keys(pendingSockets)[0];
    var o = pendingSockets[key];
    if (o != undefined) {
        addSocketPair(socket, o.socket);
        console.info("processing pending client...")
        if (o.buffers.length > 0) {
            for (var i = 0; i < o.buffers.length; i++) {
                socket.write(o.buffers[i]);
            }
        }
        delete pendingSockets[key];
        processed = true;
    }
    return processed;
}

function createRelayServer(port) {
    var relay = net.createServer(function (socket) {
        
        if (!processPending(socket)) {
            console.info("adding to available relay sockets");
            addAvailableSocket(socket);                        
        }
        
        socket.on("data", function (data) {
            var clientSocket = getSocketPair(socket);
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

            if (removeFromAvailableSockets(socket)) {
                console.info("  removing from available relay sockets");
                return;
            }

            var clientSocket = getSocketPair(socket);
            if (clientSocket == undefined) {
                console.info("  client socket not found");
            } else {
                clientSocket.end();
                deleteSocketPair(socket);
            }
        });
    });
    relay.listen(port);
}

function createInternetServer(port) {
    var server = net.createServer(function (socket) {
        
        console.info("client socket established");
        
        var relaySocket = nextAvailableSocket();
        if (relaySocket) {
            addSocketPair(socket, relaySocket);
        } else {
            console.info("  no available relay socket, buffering...");
        }

        socket.on("data", function (data) {
            var relaySocket = getSocketPair(socket);
            if (relaySocket == undefined) {
                appendToPendingSocket(socket, data);
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
            var relaySocket = getSocketPair(socket);
            if (relaySocket == undefined) {
                if (!deletePendingSocket(socket)) {
                    console.info("  relay socket not found");
                }
                return;
            }
            relaySocket.end();
            deleteSocketPair(socket);
        });
    });
    server.listen(port);
}

createRelayServer(argv.relayPort);
createInternetServer(argv.servicePort);

process.on("uncaughtException", function (err) {
    console.info(err);
});
