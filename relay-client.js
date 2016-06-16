
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

    var serverSocket = undefined;
    var connected = false;
    var buffers = new Array();

    var relaySocket = new net.Socket();
    
    relaySocket.connect(relayClient.relayPort, relayClient.relayHost, 
    function () {
        console.log("relay socket established");

        relayClient.relaySockets[uniqueKey(relaySocket)] = relaySocket;

        relaySocket.on("data", function (data) {
            if (serverSocket == undefined) {
                buffers[buffers.length] = data;

                serverSocket = new net.Socket();
                serverSocket.connect(relayClient.port, relayClient.host, 
                function () {
                    console.log("server socket established");

                    connected = true;
                    if (buffers.length > 0) {
                        for (var i = 0; i < buffers.length; i++) {
                            serverSocket.write(buffers[i]);
                        }
                    }

                    serverSocket.on("data", function (data) {
                        try {
                            relaySocket.write(data);
                        } catch (ex) {
                            console.log(ex);
                        }
                    });

                    serverSocket.on("close", function (had_error) {
                        console.log("server socket closed");
                        relaySocket.end();
                    });

                    serverSocket.on("error", function (exception) {
                        console.log("server socket error");
                        console.log(exception);
                        relaySocket.end();
                        delete relayClient.relaySockets[uniqueKey(relaySocket)];
                    });
                });

                relayClient.newSocket();
                console.log("next relay socket established");

            } else {
                if (!connected) {
                    buffers[buffers.length] = data;
                } else {
                    try {
                        serverSocket.write(data);
                    } catch (ex) {
                        console.log(ex);
                    }
                }
            }
        });

        relaySocket.on("close", function (had_error) {
            console.log("relay socket closed");
            delete relayClient.relaySockets[uniqueKey(relaySocket)];
            if (serverSocket != undefined)
                serverSocket.end();
        });

        relaySocket.on("error", function (exception) {
            console.log("relay socket error");
            console.log(exception);
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
