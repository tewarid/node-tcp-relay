#!/usr/bin/env node
var argv = require("optimist")
    .usage('Usage: $0 --relayPort [port] --servicePort [port]')
    .demand(['relayPort', 'servicePort'])
    .argv;

console.log(argv);

var net = require("net");

var nextRelaySocket;
var pendingSockets = {};
var socketPair = {};

function uniqueKey(socket) {
    var key = socket.remoteAddress + ':' + socket.remotePort;
    return key;
}

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

function createRelayServer(port) {
    var relay = net.createServer(function (socket) {
        
        var key = Object.keys(pendingSockets)[0];
        var o = pendingSockets[key];
        if (o != undefined) {
            console.log("using relay socket for pending client")
            addSocketPair(socket, o.socket);
            if (o.buffers.length > 0) {
                for (var i = 0; i < o.buffers.length; i++) {
                    socket.write(o.buffers[i]);
                }
            }
            delete pendingSockets[key];
        } else {        
            console.log("next relay socket established");
            nextRelaySocket = socket;            
        }
        
        socket.on("data", function (data) {
            var clientSocket = getSocketPair(socket);
            if (clientSocket == undefined) {
                console.log("client socket pair not found, discarding data");
                return;
            }
            try {
                clientSocket.write(data);
            } catch (ex) {
                console.log(ex);
            }
        });
        
        socket.on("close", function (had_error) {
            console.log("relay socket closed");

            if (nextRelaySocket == socket) {
                console.log("  no next relay socket")
                nextRelaySocket = undefined;
                return;
            }

            var clientSocket = getSocketPair(socket);
            if (clientSocket == undefined) {
                console.log("  client socket pair not found");
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
        
        console.log("client socket established");
        
        if (nextRelaySocket == undefined) {
            console.log("  no next relay socket, buffering...");
            var key = uniqueKey(socket);
            var o = pendingSockets[key];
            if (o == undefined) {
                o = {};
                o.socket = socket;
                o.buffers = new Array();
                pendingSockets[key] = o;
            }
        } else {
            addSocketPair(socket, nextRelaySocket);
            nextRelaySocket = undefined;            
        }

        socket.on("data", function (data) {
            var relaySocket = getSocketPair(socket);
            if (relaySocket == undefined) {
                var o = pendingSockets[uniqueKey(socket)];
                if (o != undefined) {
                    o.buffers[o.buffers.length] = data;
                }
                return;
            }
            try {
                relaySocket.write(data);
            } catch (ex) {
                console.log(ex);
            }
        });
        
        socket.on("close", function (had_error) {
            console.log("client socket closed");
            var relaySocket = getSocketPair(socket);
            if (relaySocket == undefined) {
                var key = uniqueKey(socket);
                var o = pendingSockets[key];
                if (o != undefined) {
                    delete pendingSockets[key];
                } else {                
                    console.log("  relay socket pair not found");
                    return;
                }
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
    console.log(err);
});
