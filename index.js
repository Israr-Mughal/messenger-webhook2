"use strict";
//merge brannch add-url and relases
// Imports dependencies and set up http server
const express = require("express"),
// const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

  bodyParser = require("body-parser"),
  app = express().use(bodyParser.json()); // creates express http server
var xhub = require("express-x-hub");
var http = require("http");
var request = require("request");

app.set('port', (process.env.PORT || 5000));
app.listen(app.get('port'));

app.use(xhub({ algorithm: "sha1", secret: process.env.APP_SECRET }));
app.use(bodyParser.json());

var page_access_token = "EAAKOl6tKMTgBAOKemspfYcmqQ61JbDZAfbEIqPaCkIYFDvNNwYDe3BjvedQBGPKbiBrhB5fTnSOMdZAeTElx5M8NTIJosmvguGOV7S9MDydTnHsc7Ff2pE0yEQxRu72xd3d9Gx0ov8GjZCyhPa1LnZBTvR2vtBz7reNuZC4IMzLDr8cCJFG6l";

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
  console.log("reques_body", body)
  // Checks this is an event from a page subscription
  if (body.object === "page") {
    // Iterates over each entry - there may be multiple if batched
    body.entry.forEach(function(entry) {
      // Gets the message. entry.messaging is an array, but
      // will only ever contain one message, so we get index 0

      if (entry.messaging[0].sender){

          // Gets the body of the webhook event
          let webhook_event = entry.messaging[0];
          console.log(webhook_event);

          // Get the sender PSID
          let sender_psid = webhook_event.sender.id;
          console.log('Sender PSID: ' + sender_psid);

          // Check if the event is a message or postback and
          // pass the event to the appropriate handler function
          if (webhook_event.message) {
            handleMessage(sender_psid, webhook_event.message);        
          } else if (webhook_event.postback) {
            handlePostback(sender_psid, webhook_event.postback);
          }

      } else {
            let webhook_event = entry;
            var photoRequestStr = JSON.stringify(webhook_event);
            var formData = JSON.stringify(webhook_event);

             var photoRequestStr = JSON.stringify(webhook_event);
             var formData = JSON.stringify(webhook_event);

      }
      

       request(
                {
                  headers: {
                    "Content-Type": "application/json",
                  },
                  url: "https://shuttlepro.io/api/post_callback_webhook",
                  body: formData,
                  method: "POST"
                },
                function(error, response, body) {
                  try {
                    if (!error && response.statusCode == 200) {
                         apiresponse = response.body;
                        console.log("er", response)
                    }
                  } catch (err) {
                        console.log("error1", err)
                    return ;
                  }
                }
              );
      });

    // Returns a OK response to all requests
    res.status(200).send("EVENT_RECEIVED");
  } else {
    // Returns a '404 Not Found' if event is not from a page subscription
    console.log("status is 404 else condition")
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

// Handles messages events
function handleMessage(sender_psid, received_message) {

  let response;

  // Check if the message contains text
  if (received_message.text) {    

    // Create the payload for a basic text message
    response = {
      "text": `You sent the message: "${received_message.text}". Now send me an image!`
    }
  }  
  
  // Sends the response message
  callSendAPI(sender_psid, response);    
} 
  
  // Sends the response message
  function callSendAPI(sender_psid, response) {
  // Construct the message body
  let request_body = {
    "recipient": {
      "id": sender_psid
    },
    "message": response
  }

  // Send the HTTP request to the Messenger Platform
  request({
    "uri": "https://graph.facebook.com/v2.6/me/messages",
    "qs": { "access_token": process.env.PAGE_ACCESS_TOKEN },
    "method": "POST",
    "json": request_body
  }, (err, res, body) => {
    if (!err) {
      console.log('message sent!')
    } else {
      console.error("Unable to send message:" + err);
    }
  }); 
}

// Handles messaging_postbacks events
function handlePostback(sender_psid, received_postback) {

}

// Sends response messages via the Send API
function callSendAPI(sender_psid, response) {
  
}



// testing curl calls

 // curl -H "Content-Type: application/json" -X POST "https://messenger-webhook3.herokuapp.com/webhook" -d '{"object": "page", "entry": [{"messaging": [{"message": "TEST_MESSAGE from israr"}]}]}'
 // curl -X GET "https://messenger-webhook3.herokuapp.com/webhook?hub.verify_token=kinectro_webhook_token&hub.challenge=CHALLENGE_ACCEPTED&hub.mode=subscribe"
