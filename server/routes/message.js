const express = require("express");
const MessageService = require("../services/message");
const route = express.Router();

route.post("/send", MessageService.sendMessage);
route.get("/room/:roomId", MessageService.getMessages);

module.exports = route;
