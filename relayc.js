var argv = require("optimist").argv;
console.log(argv);
 
var net = require("net");
 
function connect() {
  var relaySocket = new net.Socket();
  var onceOnly = true;
 
  relaySocket.connect(argv.rp, argv.rh, function() {
    console.log("relay socket established");
 
    var serverSocket = new net.Socket();
 
    serverSocket.connect(argv.sp, argv.sh, function() {
      console.log("server socket established");
    });
    serverSocket.on("data", function(data) {
      try {
        relaySocket.write(data);
      } catch(ex) {
        //console.log(ex);
      }
    });
    serverSocket.on("close", function(had_error) {
      console.log("server socket closed");
      relaySocket.end();
    });
    serverSocket.on("error", function(exception) {
      console.log("server socket error");
      console.log(exception);
    });
 
    relaySocket.on("data", function(data) {
      //console.log(data);
      try {
        serverSocket.write(data);
      } catch(ex) {
        //console.log(ex);
      }
      if (onceOnly) {
        console.log("next relay connection established");
        connect();
        onceOnly = false;
      }
    });
    relaySocket.on("close", function(had_error) {
      console.log("relay socket closed");
      serverSocket.end();
    });
    relaySocket.on("error", function(exception) {
      console.log("relay socket error");
      console.log(exception);
    });
  });
}
 
connect();
