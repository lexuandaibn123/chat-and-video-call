const express = require("express");
const router = express.Router();
const MessageService = require("../services/message");

// Gửi tin nhắn mới
router.post("/", (req, res) => MessageService.sendMessage(req, res));

// Lấy tất cả tin nhắn trong 1 phòng
router.get("/room/:id", (req, res) =>
  MessageService.getMessagesByRoomId(req, res)
);

// Xoá tin nhắn
router.delete("/", (req, res) => MessageService.deleteMessage(req, res));

// Sửa tin nhắn
router.put("/", (req, res) => MessageService.editMessage(req, res));

// Lấy tin nhắn mới nhất của phòng
router.post("/last", async (req, res) =>
  MessageService.getLastMessages(req, res)
);

module.exports = router;
