const io = require("socket.io")(require("express")().listen(process.env.PORT || 3000));
const firebase = require("firebase");
firebase.initializeApp(require("./config"));
//const ref = firebase.database().ref("test");
const ref = firebase.database().ref("images");

io.sockets.on("connection", function(socket) {
  socket.on("push", function(inData) {
    ref.push({
      name: inData.name,
      image: inData.image,
      time: new Date().getTime()
    });
    ref.on("value", function(dbData) {
      for (var i in dbData.val()) {
        if (dbData.val()[i].name == inData.name) {
          socket.emit("feedback", {
            image: dbData.val()[i].image
          });
        }
      }
    });
  });

  socket.on("search", function(inData) {
    ref.on("value", function(dbData) {
      var outData = [];
      for (var i in dbData.val()) {
        if (dbData.val()[i].name == inData.name) {
          outData.push(dbData.val()[i].image);
        }
      }
      if (outData) {
        socket.emit("feedback", {
          images: outData
        });
      }
    });
  });
});
