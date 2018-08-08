#!/usr/bin/env node
var argv = require("commander");

argv
    .usage("[options]")
    .version("0.0.15")
    .option("-r, --relayPort <n>", "Relay port number", parseInt)
    .option("-s, --servicePort <n>", "Internet port number", parseInt)
    .option("-h, --hostname <host>", "Name or IP address of host")
    .option("-k, --secret [key]",
        "Secret key required to be sent by relay client")
    .option("-t, --tls [both]", "Use TLS", false)
    .option("-c, --pfx [file]", "Private key file",
        require.resolve("./cert.pfx"))
    .option("-p, --passphrase [value]",
        "Passphrase to access private key file", "abcd")
    .parse(process.argv);

var options = {
    hostname: argv.hostname,
    secret: argv.secret,
	tls: argv.tls,
    pfx: argv.pfx,
    passphrase: argv.passphrase
};

var relayServer = require("./relay-server.js");

var newRelayServer = relayServer.createRelayServer(argv.relayPort,
argv.servicePort, options);

process.on("uncaughtException", function(err) {
    console.log(err);
});

process.on("SIGINT", function() {
    newRelayServer.end();
});
