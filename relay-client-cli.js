#!/usr/bin/env node
var argv = require("commander");
var packageConfig = require('./package.json');

argv
    .usage("[options]")
    .version(packageConfig.version)
    .option("-n, --host <host>", "Name or IP address of service host")
    .option("-s, --port <n>", "Service port number", parseInt)
    .option("-h, --relayHost <relayHost>", "Name or IP address of relay host")
    .option("-r, --relayPort <n>", "Relay port number", parseInt)
    .option("-c, --numConn [numConn]",
        "Number of connections to maintain with relay", 1)
    .option("-t, --tls [both]", "Use TLS 1.2 with relay server; " +
        "specify value both to also use TLS 1.2 with service", false)
    .option("-u, --rejectUnauthorized [value]",
        "Do not accept invalid certificate", false)
    .option("-f, --caFile [value]",
        "CA certs file to authenticate relay server")
    .option("-x, --pfx [file]", "Private key file",
        require.resolve("./cert.pfx"))
    .option("-p, --passphrase [value]",
        "Passphrase to access private key file", "abcd")
    .parse(process.argv);

var options = {
    numConn: argv.numConn,
	tls: argv.tls,
    rejectUnauthorized: argv.rejectUnauthorized !== "false",
    caFile: argv.caFile,
    pfx: argv.pfx,
    passphrase: argv.passphrase
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
