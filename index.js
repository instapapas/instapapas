const io = require("socket.io")(require("express")().listen(process.env.PORT || 3000));
const firebase = require("firebase");
firebase.initializeApp(require("./config"));
//const ref = firebase.database().ref("test");
const ref = firebase.database().ref("images");

io.sockets.on("connection", function(socket) {
  socket.on("push", function(clientData) {
    ref.push({
      name: clientData.name,
      image: clientData.image,
      time: new Date().getTime()
    });
    ref.on("value", function(databaseData) {
      for (var i in databaseData.val()) {
        if (databaseData.val()[i].name == clientData.name) {
          socket.emit("feedback", {
            image: databaseData.val()[i].image
          });
        }
      }
    });
  });
});
