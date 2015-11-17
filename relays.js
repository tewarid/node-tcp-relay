#!/usr/bin/env node
var argv = require("optimist")
  .usage('Usage: $0 --relayPort [port] --servicePort [port]')
  .demand(['relayPort', 'servicePort'])
  .argv;

console.log(argv);

var net = require("net");

var controlSocket;
var nextSocket;
var socketPair = {};

var relay = net.createServer(function (socket) {
  console.log("next relay socket established");
  nextSocket = socket;
  socket.on("data", function (data) {
    var clientSocket = socketPair[uniqueKey(socket)];
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
    
    if (nextSocket == socket) {
      console.log("  no next relay socket")
      nextSocket = undefined;
    }
    
    var clientSocket = socketPair[uniqueKey(socket)];
    if (clientSocket == undefined) {
      console.log("  client socket pair not found");
    } else {
      clientSocket.end();
      delete socketPair[uniqueKey(socket)];
      delete socketPair[uniqueKey(clientSocket)];
    }
  });
});
relay.listen(argv.relayPort);

var server = net.createServer(function (socket) {
  console.log("client socket established");
  if (nextSocket == undefined) {
    console.log("  next relay socket not found");
    socket.end();
    return;
  }

  socketPair[uniqueKey(socket)] = nextSocket;
  socketPair[uniqueKey(nextSocket)] = socket;
  nextSocket = undefined;

  socket.on("data", function (data) {
    var relaySocket = socketPair[uniqueKey(socket)];
    if (relaySocket == undefined) {
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
    var relaySocket = socketPair[uniqueKey(socket)];
    if (relaySocket == undefined) {
      console.log("  relay socket pair not found");
      return;
    }
    relaySocket.end();
    delete socketPair[uniqueKey(socket)];
    delete socketPair[uniqueKey(relaySocket)];
  });
});
server.listen(argv.servicePort);

function uniqueKey(socket) {
  var key = socket.remoteAddress + ':' + socket.remotePort;
  return key;
}

process.on("uncaughtException", function (err) {
  console.log(err);
});
