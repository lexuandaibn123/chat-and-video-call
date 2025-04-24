const express = require("express");
const router = express.Router();
const MessageService = require("../services/message");

router.post("/", (req, res) => MessageService.createMessage(req, res));

router.get("/room/:id", (req, res) => MessageService.getMessages(req, res));

router.delete("/", (req, res) => MessageService.deleteMessage(req, res));

router.put("/", (req, res) => MessageService.updateMessage(req, res));

router.post("/last", async (req, res) =>
  MessageService.getLastMessages(req, res)
);

module.exports = router;
