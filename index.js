const io = require("socket.io")(require("express")().listen(process.env.PORT || 3000));
const firebase = require("firebase");
firebase.initializeApp(require("./config"));
const pictures = firebase.database().ref("images");
const users = firebase.database().ref("users");

io.sockets.on("connection", function(socket) {
  socket.on("push", function(inData) {
    pictures.push({
      name: inData.name,
      image: inData.image,
      time: new Date().getTime()
    });
    pictures.on("value", function(dbData) {
      for (var i in dbData.val()) {
        if (dbData.val()[i].username == inData.username) {
          socket.emit("feedback", {
            image: dbData.val()[i].image
          });
        }
      }
    });
  });

  socket.on("search", function(inData) {
    pictures.on("value", function(dbData) {
      var outData = [];
      for (var i in dbData.val())
        if (dbData.val()[i].name == inData.name)
          outData.push(dbData.val()[i].image);
      if (outData) {
        socket.emit("feedback", {
          images: outData
        });
      }
    });
  });

  socket.on("createUser", function(inData) {
    const address = inData.email;
    const empty = inData.name.length == 0;
    var alreadyRegistered = false;
    users.on("value", function(dbData) {
      for (var i in dbData.val()) {
        if (dbData.val()[i].username == inData.username) {
          alreadyRegistered = true;
          break;
        }
      }
    });
    const indexAt = address.indexOf("@");
    const indexDot = address.lastIndexOf(".");
    const isEmail = 1 < indexAt && indexAt + 2 < indexDot && indexDot < address.length - 2 && !address.includes(" ") && address.replace(/[^@]/g, "").length == 1;
    const passwordsMatch = inData.password == inData.confirmPassword;

    var feedback = "Something unexpected happened";
    if (empty) feedback = "Your name is empty";
    if (alreadyRegistered) feedback = "This email was already registered";
    if (!isEmail) feedback = "This email address is not valid";
    if (!passwordsMatch) feedback = "Passwords don't match";

    if (!(alreadyRegistered || empty || !isEmail)) {
      feedback = "Your email \"" + address + "\" was registered!\nCheck your email for confirmation.";
      const confirmationSecret = Math.random().toString(36).substring(2);
      require("password-hash-and-salt")(inData.password).hash(function(error, hash) {
        users.push({
          username: inData.username,
          name: inData.name,
          email: address,
          password: hash,
          secret: confirmationSecret,
          time: new Date().getTime()
        });
      });
      const subject = "Hello " + inData.username + ", confirm your email address";
      const content = "Your email address \"" + address + "\" has been requested under the username of \"" + inData.username + "\" in the instapapas users database.\n\nIf you want to register it, click on <a href=\"https://instapapas.github.io/confirm?" + confirmationSecret + "\">this link</a> within the next hour or so, otherwise the request will be deleted";
      sendEmail(address, subject, content, "instapapas@matiascontilde.me");
    }
    socket.emit("feedback", {
      fb: feedback
    });
  });

  socket.on("confirm", function(inData) {
    users.on("value", function(dbData) {
      for (var i in dbData.val()) {
        const user = dbData.val()[i];
        require("password-hash-and-salt")(inData.password).verifyAgainst(user.password, function(error, verified) {
          if (user.secret == inData.secret && verified) {
            users.child(i).update({
              secret: null,
              time: new Date().getTime()
            });
            socket.emit("feedback", {
              fb: "Your account \"" + user.username + "\" has been confirmed"
            });
          }
        });
      }
    });
  });
});

const day = 1000 * 60 * 60;
setInterval(function() {
  users.on("value", function(dbData) {
    for (var i in dbData.val()) {
      const object = dbData.val()[i]
      const now = new Date().getTime();
      if (now - object.time > day && object.secret) {
        users.child(i).remove();
      }
    }
  });
}, day / 2);

function sendEmail(address, subject, content, from) {
  const helper = require("sendgrid").mail;
  const fromEmail = new helper.Email(from);
  const toEmail = new helper.Email(address);
  const helperContent = new helper.Content("text/html", template(content));
  const mail = new helper.Mail(fromEmail, subject, toEmail, helperContent);

  const sg = require("sendgrid")(process.env.SENDGRID_API_KEY);
  sg.API(sg.emptyRequest({
    method: "POST",
    path: "/v3/mail/send",
    body: mail.toJSON()
  }));
}

function template(content) {
  return `<body style="@import url('https://fonts.googleapis.com/css?family=Roboto+Mono:300'); text-align: center; font-family: 'Roboto Mono', monospace; color: black;">
    <h1 style="font-size: 2rem; font-weight: 100;">instapapas</h1>
    <p>` + content + `</p>
  </body>`
}
