const MessageRepository = require("../repositories/message");

class MessageService {
  async sendMessage(req, res) {
    try {
      const { roomId, content } = req.body;
      const message = await MessageRepository.create({
        chatRoom: roomId,
        sender: req.session.userInfo._id,
        content,
      });
      res.status(201).json({ message });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async getMessages(req, res) {
    try {
      const { roomId } = req.params;
      const messages = await MessageRepository.getMessagesByRoomId(roomId);
      res.status(200).json({ messages });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
}

module.exports = new MessageService();
