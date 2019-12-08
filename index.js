"use strict";
//merge brannch add-url and relases
// Imports dependencies and set up http server
const express = require("express"),
  bodyParser = require("body-parser"),
  app = express().use(bodyParser.json()); // creates express http server
var xhub = require("express-x-hub");
var http = require("http");

// app.set('port', (process.env.PORT || 5000));
// app.listen(app.get('port'));

app.use(xhub({ algorithm: "sha1", secret: process.env.APP_SECRET }));
app.use(bodyParser.json());

var token = process.env.TOKEN || "kinectro_webhook_token";
var received_updates = [];

app.get("/", function(req, res) {
  console.log("hit index url", req.body);
  res.send("<pre>" + JSON.stringify(received_updates, null, 2) + "</pre>");
});

app.get(["/facebook", "/instagram"], function(req, res) {
  console.log("/facebook,/instagram");
  if (
    req.query["hub.mode"] == "subscribe" &&
    req.query["hub.verify_token"] == process.env.TOKEN
  ) {
    res.send(req.query["hub.challenge"]);
  } else {
    res.sendStatus(400);
  }
});

app.post("/facebook", function(req, res) {
  console.log("Facebook request body:", req.body);

  if (!req.isXHubValid()) {
    console.log(
      "Warning - request header X-Hub-Signature not present or invalid"
    );
    res.sendStatus(401);
    return;
  }

  console.log("request header X-Hub-Signature validated");
  // Process the Facebook updates here
  received_updates.unshift(req.body);
  res.sendStatus(200);
});

app.post("/instagram", function(req, res) {
  console.log("instagram request body", req.body);
  // Process the Instagram updates here
  received_updates.unshift(req.body);
  res.sendStatus(200);
});

// ------------------
// Sets server port and logs message on success
app.listen(process.env.PORT || 1337, () => console.log("webhook is listening"));

// Creates the endpoint for our webhook
app.post("/webhook", (req, res) => {
  let body = req.body;

  // Checks this is an event from a page subscription
  if (body.object === "page") {
    // Iterates over each entry - there may be multiple if batched
    body.entry.forEach(function(entry) {
      // Gets the message. entry.messaging is an array, but
      // will only ever contain one message, so we get index 0
      console.log("************");
      console.log(entry.changes[0]);
      console.log("************");
      let webhook_event = entry.changes[0];
      var photoRequestStr = JSON.stringify(webhook_event);
      var str = "";
      var options = {
        host: "3.87.54.185",
        path: "/api/post_callback_webhook",
        port: "80",
        method: "POST",
        headers: {
          "Content-Length": photoRequestStr.length,
          "Content-Type": "application/json"
        }
      };

      http
        .request(options, function(res) {
          res.setEncoding("utf8");
          res.on("data", function(data) {
            str += data;
          });

          res.on("end", function() {
            console.log(str);
          });

          res.on("error", function(error) {
            console.log(error);
          });
        })
        .end(photoRequestStr);
    });

    // Returns a OK response to all requests
    res.status(200).send("EVENT_RECEIVED");
  } else {
    // Returns a '404 Not Found' if event is not from a page subscription
    res.sendStatus(404);
  }
});

// Adds support for GET requests to our webhook
app.get("/webhook", (req, res) => {
  // Your verify token. Should be a random string.
  let VERIFY_TOKEN = "kinectro_webhook_token";

  // Parse the query params
  let mode = req.query["hub.mode"];
  let token = req.query["hub.verify_token"];
  let challenge = req.query["hub.challenge"];
  console.log(mode);
  console.log(token);
  console.log(challenge);

  // Checks if a token and mode is in the query string of the request
  if (mode && token) {
    // Checks the mode and token sent is correct
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      // Responds with the challenge token from the request
      console.log("WEBHOOK_VERIFIED");
      res.status(200).send(challenge);
      var photoRequestStr = JSON.stringify(challenge);
      var str = "";
      var options = {
        host: "localhost",
        path: "/api/post_callback_webhook",
        port: "3000",
        method: "POST",
        headers: {
          "Content-Length": photoRequestStr.length,
          "Content-Type": "application/json"
        }
      };

      http
        .request(options, function(res) {
          res.setEncoding("utf8");
          res.on("data", function(data) {
            str += data;
          });

          res.on("end", function() {
            console.log(str);
          });

          res.on("error", function(error) {
            console.log(error);
          });
        })
        .end(photoRequestStr);
    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);
    }
  }
});
