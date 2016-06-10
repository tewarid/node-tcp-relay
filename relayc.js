#!/usr/bin/env node
var argv = require("optimist")
    .usage('Usage: $0 --host [host] --port [port] --relayHost [host] --relayPort [port] [--numConn [count]]')
    .demand(['host', 'port', 'relayHost', 'relayPort'])
    .argv;

console.log(argv);

var relayClient = require("./relayClient.js")

var newRelayClient = relayClient.createRelayClient(argv.host, argv.port, argv.relayHost, argv.relayPort, argv.numConn);

process.on("uncaughtException", function (err) {
    console.info(err);
});

process.on("SIGINT", function() {
    console.log("Terminating relay client");
    newRelayClient.end();
    process.exit();
});
