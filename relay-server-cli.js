#!/usr/bin/env node
var argv = require("commander");
var packageConfig = require('./package.json');

argv
    .usage("[options]")
    .version(packageConfig.version)
    .option("-r, --relayPort <n>", "Relay port number", parseInt)
    .option("-s, --servicePort <n>", "Internet port number", parseInt)
    .option("-h, --hostname <host>", "Name or IP address of host")
    .option("-t, --tls [both]", "Use TLS 1.2 with relay server; " +
        "specify value both to also use TLS 1.2 with internet clients", false)
    .option("-c, --pfx [file]", "Private key file",
        require.resolve("./cert.pfx"))
    .option("-p, --passphrase [value]",
        "Passphrase to access private key file", "abcd")
    .option("-a, --auth",
        "Authenticate relay client by requesting its certificate; " +
        "implies tls option is specified")
    .option("-f, --caFile [value]",
        "CA certs file used for validating client certificate")
    .parse(process.argv);

var options = {
    hostname: argv.hostname,
	tls: argv.tls || argv.auth,
    pfx: argv.pfx,
    passphrase: argv.passphrase,
    auth: argv.auth,
    caFile: argv.caFile
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
