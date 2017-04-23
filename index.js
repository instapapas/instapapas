// Create socket server in Heroku or at port 3000 if localhost
const io = require("socket.io")(require("express")().listen(process.env.PORT || 3000));
// Create firebase
const firebase = require("firebase");
// Initialize firebase instance with Heroku config vars
firebase.initializeApp({
  apiKey: process.env.API_KEY,
  authDomain: process.env.AUTH_DOMAIN,
  databaseURL: process.env.DATABASE_URL,
  storageBucket: process.env.STORAGE_BUCKET,
  messagingSenderId: process.env.MESSAGING_SENDER_ID
});
// Create firebase images reference
const pictures = firebase.database().ref("images");
// Create firebase users reference
const users = firebase.database().ref("users");

// When a client connects
io.sockets.on("connection", socket => {
  // When the client sends a "upload" message
  socket.on("upload", (inData, fb) => {
    // Add it to firebase
    pictures.push({
      name: inData.name,
      image: inData.image,
      time: new Date().getTime()
    });
    // Send back feedback
    fb(inData.name);
  });

  // When the client sends a "search" message
  socket.on("search", (name, fb) => {
    // Recieve all pictures
    pictures.on("value", dbData => {
      var outData = [];
      for (var i in dbData.val()) {
        // If the image name matches the search, push it to the array
        if (name === dbData.val()[i].name || name === "*") {
          outData.push(dbData.val()[i]);
        }
      }
      // Send back the image array
      fb(outData);
    });
  });

  // When the client sends a "register" message
  socket.on("register", (inData, fb) => {
    const address = inData.email;

    // Check if name is empty
    const empty = inData.name.length === 0;

    // Check if username is already in the database
    var alreadyRegistered = false;
    users.on("value", dbData => {
      for (var i in dbData.val()) {
        if (dbData.val()[i].username === inData.username) {
          alreadyRegistered = true;
          break;
        }
      }
    });

    // Check if the email address is valid
    const indexAt = address.indexOf("@");
    const indexDot = address.lastIndexOf(".");
    const isEmail = 1 < indexAt && indexAt + 2 < indexDot && indexDot < address.length - 2 && !address.includes(" ") && address.replace(/[^@]/g, "").length === 1;
    const passwordsMatch = inData.password === inData.confirmPassword;

    // Determine the feedback message
    var feedback = "Something unexpected happened";
    if (empty) feedback = "Your name is empty";
    if (alreadyRegistered) feedback = "This username was already registered";
    if (!isEmail) feedback = "This email address is not valid";
    if (!passwordsMatch) feedback = "Passwords don't match";

    // If everything is correct
    if (!(alreadyRegistered || empty || !isEmail || !passwordsMatch)) {
      feedback = "Your account \"" + inData.username + "\" was registered!\nCheck your email for confirmation.";

      // Create a confirmation secret to confirm the account
      const confirmationSecret = Math.random().toString(36).substring(2);

      // Hash the password
      require("password-hash-and-salt")(inData.password).hash((error, hash) => {
        // Add user to the database
        users.push({
          username: inData.username,
          name: inData.name,
          email: address,
          password: hash,
          secret: confirmationSecret,
          time: new Date().getTime()
        });
      });

      // Define the email to send and send it
      const subject = "Hello " + inData.username + ", confirm your email address";
      const content = "Your email address \"" + address + "\" has been requested under the username of \"" + inData.username + "\" in the instapapas users database.\n\nIf you want to register it, click on <a href=\"https://instapapas.github.io/confirm?" + confirmationSecret + "\">this link</a> within the next twelve hours, otherwise the request will be deleted";
      sendEmail(address, subject, content, "instapapas@matiascontilde.me");
    }

    // Send feedback to the client
    fb(feedback);
  });

  // To confirm an account
  socket.on("confirm", (inData, fb) => {
    // Define the feedback firstly as if everything would have gone wrong
    var feedback = "Something unexpected happened";

    // Get all users from the database
    users.on("value", dbData => {
      // Loop through all users
      for (var i in dbData.val()) {
        const user = dbData.val()[i];
        //If that user has the matching secret
        if (user.secret === inData.secret) {
          // Check if password is correct
          require("password-hash-and-salt")(inData.password).verifyAgainst(user.password, (error, verified) => {
            if (verified) {
              // Delete the secret from the user and update the time
              users.child(i).update({
                secret: null,
                time: new Date().getTime()
              });
              feedback = "Your account \"" + user.username + "\" has been confirmed";
            } else {
              feedback = "Incorrect password";
            }
            fb(feedback);
          });
        }
      }
    });
  });
});

// Every 12 hours, delete unconfirmed emails
const hour = 1000 * 60 * 60 * 12;
setInterval(() => {
  users.on("value", dbData => {
    for (var i in dbData.val()) {
      const user = dbData.val()[i];
      if (new Date().getTime() - user.time > hour && user.secret) {
        users.child(i).remove();
      }
    }
  });
}, hour / 2);

// Send an email with SendGrid
let sendEmail = (address, subject, content, from) => {
  // Define the needed parameters
  const helper = require("sendgrid").mail;
  const fromEmail = new helper.Email(from);
  const toEmail = new helper.Email(address);
  // Use tamplate function to convert the content to HTML with style
  const helperContent = new helper.Content("text/html", template(content));
  const mail = new helper.Mail(fromEmail, subject, toEmail, helperContent);

  // Create SendGrid instance with a config var from Heroku
  const sg = require("sendgrid")(process.env.SENDGRID_API_KEY);
  // Send it
  sg.API(sg.emptyRequest({
    method: "POST",
    path: "/v3/mail/send",
    body: mail.toJSON()
  }));
};

// Takes a message and returns a stylized version of it
let template = (content) => {
  return `<body style="@import url('https://fonts.googleapis.com/css?family=Roboto+Mono:300'); text-align: center; font-family: 'Roboto Mono', monospace; color: black;">
    <h1 style="font-size: 2rem; font-weight: 100;">instapapas</h1>
    <p>` + content + `</p>
  </body>`;
};
