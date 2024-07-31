import asyncHandler from "express-async-handler";

const HomeControls = {
  postWebhook: asyncHandler(async (req, res) => {
    let body = req.body;

    if (body.object === "page") {
      body.entry.forEach(function (entry) {
        let webhook_event = entry.messaging[0];
        console.log(webhook_event);
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
};

export default HomeControls;
