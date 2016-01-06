#!/usr/bin/env node
var argv = require("optimist")
    .usage('Usage: $0 --host [host] --port [port] --relayHost [host] --relayPort [port] [--numConn [count]]')
    .demand(['host', 'port', 'relayHost', 'relayPort'])
    .argv;

console.log(argv);

var net = require("net");

function connect() {
    var relaySocket = new net.Socket();
    var serverSocket = undefined;

    relaySocket.connect(argv.relayPort, argv.relayHost, function () {
        console.log("relay socket established");

        relaySocket.on("data", function (data) {
            if (serverSocket == undefined) {
                serverSocket = new net.Socket();

                serverSocket.connect(argv.port, argv.host, function () {
                    console.log("server socket established");
                    serverSocket.write(data);
                });
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
                });

                connect();
                console.log("next relay socket established");
            } else {
                try {
                    serverSocket.write(data);
                } catch (ex) {
                    console.log(ex);
                }
            }
        });
        relaySocket.on("close", function (had_error) {
            console.log("relay socket closed");
            if (serverSocket != undefined)
                serverSocket.end();
        });
        relaySocket.on("error", function (exception) {
            console.log("relay socket error");
            console.log(exception);
        });
    });
}

var count = argv.numConn;
if (count == undefined) {
    count = 1;
}
for (var i = 0; i < count; i++) {
    connect();
}
