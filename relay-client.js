
var net = require("net");

function uniqueKey(socket) {
    var key = socket.localAddress + ':' + socket.localPort;
    return key;
}

function RelayClient(host, port, relayHost, relayPort, numConn) {
    this.host = host;
    this.port = port;
    this.relayHost = relayHost;
    this.relayPort = relayPort;
    this.numConn = numConn;
    this.relaySockets = {};

    if (this.numConn == undefined) {
        this.numConn = 1;
    }

    for (var i = 0; i < this.numConn; i++) {
        this.newSocket();
    }
}

RelayClient.prototype.newSocket = function () {
    var relayClient = this;

    var socket = undefined;
    var connected = false;
    var buffers = new Array();

    var relaySocket = new net.Socket();
    
    relaySocket.connect(relayClient.relayPort, relayClient.relayHost, 
    function () {
        console.log("relay socket established");

        relayClient.relaySockets[uniqueKey(relaySocket)] = relaySocket;

        relaySocket.on("data", function (data) {
            if (socket == undefined) {
                buffers[buffers.length] = data;

                socket = new net.Socket();
                socket.connect(relayClient.port, relayClient.host, 
                function () {
                    console.log("service socket established");

                    connected = true;
                    if (buffers.length > 0) {
                        for (var i = 0; i < buffers.length; i++) {
                            socket.write(buffers[i]);
                        }
                        buffers == undefined;
                    }

                    socket.on("data", function (data) {
                        try {
                            relaySocket.write(data);
                        } catch (ex) {
                            console.log(ex);
                        }
                    });

                    socket.on("close", function (had_error) {
                        console.log("service socket closed");
                        console.log(had_error);
                        socket == undefined;
                        console.log("  ending relay socket");
                        relaySocket.destroy();
                    });
                });

                socket.on("error", function (e) {
                    console.log("service socket error");
                    console.log(e);
                    console.log("  ending relay socket");
                    relaySocket.destroy();
                });

                relayClient.newSocket();
                console.log("next relay socket established");

            } else {
                if (!connected) {
                    buffers[buffers.length] = data;
                } else {
                    try {
                        socket.write(data);
                    } catch (ex) {
                        console.log(ex);
                    }
                }
            }
        });

        relaySocket.on("close", function (had_error) {
            console.log("relay socket closed");
            delete relayClient.relaySockets[uniqueKey(relaySocket)];
            if (socket != undefined)
                socket.destroy();
        });

        relaySocket.on("error", function(e) {
            console.log("relay socket error");
            console.log(e);
        });
    });
}

RelayClient.prototype.end = function () {
    console.log("Terminating relay client");
    for (var key in this.relaySockets) {
        this.relaySockets[key].end();
    }
}

exports.createRelayClient = function createRelayClient(host, port, relayHost, relayPort, numConn) {
    return new RelayClient(host, port, relayHost, relayPort, numConn);
}
