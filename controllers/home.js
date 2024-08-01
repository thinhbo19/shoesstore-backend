import asyncHandler from "express-async-handler";
import request from "request";

const HomeControls = {
  postWebhook: asyncHandler(async (req, res) => {
    let body = req.body;

    if (body.object === "page") {
      body.entry.forEach(function (entry) {
        let webhook_event = entry.messaging[0];
        console.log(webhook_event);

        let sender_psid = webhook_event.sender.id;
        console.log(sender_psid);

        if (webhook_event.message) {
          HomeControls.handleMessage(sender_psid, webhook_event.message);
        } else if (webhook_event.postback) {
          HomeControls.handlePostback(sender_psid, webhook_event.postback);
        }
      });
      res.status(200).send("EVENT_RECEIVED");
    } else {
      res.sendStatus(400);
    }
  }),

  getWebhook: asyncHandler(async (req, res) => {
    const VERIFY_TOKEN = "randomString";

    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode && token === VERIFY_TOKEN) {
      if (mode === "subscribe") {
        console.log("WEBHOOK_VERIFIED");
        res.status(200).send(challenge);
      } else {
        res.sendStatus(403);
      }
    } else {
      res.sendStatus(403);
    }
  }),

  handleMessage: async (sender_psid, received_message) => {
    let response;
    if (received_message.text) {
      response = {
        text: `You sent the message: ${received_message.text}. Now send me an image!`,
      };
    }
    await HomeControls.callSendAPI(sender_psid, response);
  },

  handlePostback: async (sender_psid, received_postback) => {
    // Xử lý khi người dùng click vào các postback buttons
    console.log("Received postback:", received_postback);
  },

  callSendAPI: async (sender_psid, response) => {
    let request_body = {
      recipient: {
        id: sender_psid,
      },
      message: response,
    };
    request(
      {
        uri: "https://graph.facebook.com/v2.6/me/messages",
        qs: { access_token: process.env.PAGE_ACCESS_TOKEN },
        method: "POST",
        json: request_body,
      },
      (err, res, body) => {
        if (!err) {
          console.log("Message sent!");
        } else {
          console.error("Unable to send message:" + err);
        }
      }
    );
  },
};

export default HomeControls;
