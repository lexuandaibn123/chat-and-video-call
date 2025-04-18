const MessageRepository = require("../repositories/message");

class MessageService {
  async sendMessage(req, res) {
    try {
      const { roomId, content } = req.body;
      const sender = req.session.userInfo._id;

      if (!roomId || !content) {
        return res
          .status(400)
          .json({ error: "roomId and content are required" });
      }

      const message = await MessageRepository.create({
        sender: req.session.userInfo._id,
        room: roomId,
        content,
      });

      return res.status(201).json({ success: true, message });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  async getMessagesByRoomId(req, res) {
    try {
      const roomId = req.params.id;
      const messages = await MessageRepository.findByRoomId(roomId);

      return res.status(200).json({ success: true, messages });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  // Xoá tin nhắn
  async deleteMessage(req, res) {
    try {
      const { messageId } = req.body;

      if (!messageId) {
        return res.status(400).json({ error: "messageId is required" });
      }

      const deleted = await MessageRepository.delete(messageId);

      if (!deleted) {
        return res.status(404).json({ error: "Message not found" });
      }

      return res
        .status(200)
        .json({ success: true, message: "Message deleted" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  // Sửa tin nhắn
  async editMessage(req, res) {
    try {
      const { messageId, newContent } = req.body;

      if (!messageId || !newContent) {
        return res
          .status(400)
          .json({ error: "messageId and newContent are required" });
      }

      const updatedMessage = await MessageRepository.update(messageId, {
        content: newContent,
      });

      if (!updatedMessage) {
        return res.status(404).json({ error: "Message not found" });
      }

      return res.status(200).json({ success: true, message: updatedMessage });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  async getLastMessages(req, res) {
    try {
      const { roomIds } = req.body;

      if (!roomIds || roomIds.length === 0) {
        return res.status(400).json({ error: "Room IDs are required" });
      }

      // Lấy tin nhắn mới nhất trong mỗi phòng
      const messages = await MessageRepository.getLastMessagesByRooms(roomIds);

      return res.status(200).json({ success: true, messages });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
}

module.exports = new MessageService();
