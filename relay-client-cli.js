#!/usr/bin/env node
var argv = require("commander");

argv
    .usage("[options]")
    .version("0.0.15")
    .option("-n, --host <host>", "Name or IP address of service host")
    .option("-s, --port <n>", "Service port number", parseInt)
    .option("-h, --relayHost <relayHost>", "Name or IP address of relay host")
    .option("-r, --relayPort <n>", "Relay port number", parseInt)
    .option("-c, --numConn [numConn]",
        "Number of connections to maintain with relay", 1)
    .option("-k, --secret [key]", "Secret key to send to relay host")
    .option("-t, --tls [both]", "Use TLS", false)
    .option("-u, --rejectUnauthorized [value]",
        "Do not accept invalid certificate", false)
    .parse(process.argv);

var options = {
    numConn: argv.numConn,
	tls: argv.tls,
    secret: argv.secret,
    rejectUnauthorized: argv.rejectUnauthorized === "true"
};

var relayClient = require("./relay-client.js");

var newRelayClient = relayClient.createRelayClient(argv.host, argv.port,
    argv.relayHost, argv.relayPort, options);

process.on("uncaughtException", function(err) {
    console.log(err);
});

process.on("SIGINT", function() {
    newRelayClient.end();
});
