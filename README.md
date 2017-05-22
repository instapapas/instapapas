# instapapas
## What is this?
I's my try on making a social network based on pictures like Instagram
## Why?
I got access to the [GitHub education pack](http://education.github.com) and wanted to try some things out, so I created an [email suscription service for my site](http://matiascontilde.me/email), [matiascontilde.me](http://matiascontilde.me), with [SendGrid](http://sendgrid.com) and [FireBase](http://firebase.google.com).
After that, I wanted to make something new and challenging for me, and so I remembered an inside-joke between my friends and I calling [Instagram](http://instagram.com) instapapas and I decided to finally do it for real.

## How does it work?
This is the back-end code for it, the front-end is at [instapapas.gitub.io](http://github.com/instapapas/instapapas.github.io) made with [node.js](http://nodejs.org).
The back-end is hosted on [Heroku](http://heroku.com) with a socket server to connect to. The front-end connects to this server and sends data to do different things (I recommend watching [these]() tutorials to understand it). This back-end is connected to a Firebase database and Google Cloud storage, in which it saves the images and users. It can also send emails with an SendGrid integration.
