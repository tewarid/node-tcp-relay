var relayClient = require("./relay-client");
var relayServer = require("./relay-server");

exports.createRelayClient = relayClient.createRelayClient;
exports.client = {
    RelayClient: relayClient.RelayClient,
    Client: relayClient.Client
}

exports.createRelayServer = relayServer.createRelayServer;
exports.server = {
    RelayServer: relayServer.RelayServer,
    Listener: relayServer.Listener,
    Client: relayServer.Client
}
