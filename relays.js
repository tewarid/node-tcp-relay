var argv = require("optimist").argv;
console.log(argv);
 
var net = require("net");
 
var controlSocket;
var nextSocket;
var socketPair = new Array();
 
var relay = net.createServer(function (socket) {
  console.log("next relay socket established");
  nextSocket = socket;
  socket.on("data", function (data) {
    var clientSocket = socketPair[uniqueKey(socket)];
    if (clientSocket == undefined) {
      //console.log("client socket pair not found");
      socket.end();
      return;
    }
    try {
      clientSocket.write(data);
    } catch(ex) {
      //console.log(ex);
    }
  });
  socket.on("close", function(had_error) {
    console.log("relay socket closed");
    var clientSocket = socketPair[uniqueKey(socket)];
    if (clientSocket == undefined) {
      console.log(" client socket pair not found");
    } else {
      clientSocket.end();
      delete socketPair[uniqueKey(socket)];
      delete socketPair[uniqueKey(clientSocket)];
    }
    if (nextSocket == socket) {
        //requestNextSocket();
    }
  });
  //socket.write('GET / HTTP/1.1\r\n\r\n');
});
relay.listen(argv.rp);
 
var server = net.createServer(function (socket) {
  console.log("client socket established");
  //console.log(socket);
  if (nextSocket == undefined) {
    console.log(" next relay socket not found");
    socket.end();
    return;
  }
 
  socketPair[uniqueKey(socket)] = nextSocket;
  socketPair[uniqueKey(nextSocket)] = socket;
 
  socket.on("data", function (data) {
    //console.log(data);
    var relaySocket = socketPair[uniqueKey(socket)];
    if (relaySocket == undefined) {
      //console.log("relay socket pair not found");
      return;
    }
    try {
      relaySocket.write(data);
    } catch(ex) {
      //console.log(ex);
    }
  });
  socket.on("close", function(had_error) {
    console.log("client socket closed");
    var relaySocket = socketPair[uniqueKey(socket)];
    if (relaySocket == undefined) {
      console.log(" relay socket pair not found");
      return;
    }
    relaySocket.end();
    delete socketPair[uniqueKey(socket)];
    delete socketPair[uniqueKey(relaySocket)];
  });
});
server.listen(argv.sp);
 
function uniqueKey(socket) {
  var key = socket.remoteAddress + ':' + socket.remotePort;
  //console.log(key);
  return key;
}
 
process.on("uncaughtException", function(err) {
  console.log(err);
});
