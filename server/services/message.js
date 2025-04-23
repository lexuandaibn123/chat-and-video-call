const { validationResult } = require("express-validator");
const MessageRepository = require("../repositories/message");

class MessageService {
  async createMessageHandler(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array() });
      }

      const { id, conversationId, senderId, type, data, replyToMessageId } =
        req.body;

      const baseData = {
        id,
        conversationId,
        senderId,
        type,
        replyToMessageId,
      };

      const content = {};

      switch (type) {
        case "text":
          if (!data.text) throw new Error("Missing text data");
          content.text = { text: data.text };
          break;
        case "image":
          if (!data.url) throw new Error("Missing image URL");
          content.image = {
            image_url: { url: data.url },
            metadata: data.metadata || null,
          };
          break;
        case "audio":
          if (!data.data) throw new Error("Missing audio data");
          content.audio = {
            input_audio: { data: data.data },
            metadata: data.metadata || null,
          };
          break;
        case "file":
          if (!data.file_data || !data.filename)
            throw new Error("Missing file data");
          content.file = {
            file: {
              file_data: data.file_data,
              file_id: data.file_id || null,
              filename: data.filename,
            },
            metadata: data.metadata || null,
          };
          break;
        default:
          throw new Error(`Unsupported message type: ${type}`);
      }

      const newMessage = {
        ...baseData,
        content,
      };

      const savedMessage = await MessageRepository.create(newMessage);

      return res.status(201).json({
        success: true,
        message: "Message created successfully",
        data: savedMessage,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  async getMessagesHandler(req, res) {
    try {
      const { conversationId, limit = 10, skip = 0 } = req.query;

      if (!conversationId) {
        return res.status(400).json({ error: "Conversation ID is required" });
      }

      const messages = await MessageRepository.find(
        { conversationId },
        { limit, skip }
      );

      return res.status(200).json({
        success: true,
        data: messages,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  async updateMessageHandler(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array() });
      }

      const { messageId, senderId, type, data } = req.body;

      
      const updatedMessage = await MessageRepository.update(
        messageId,
        senderId,
        type,
        data
      );

      return res.status(200).json({
        success: true,
        message: "Message updated successfully",
        data: updatedMessage,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  async deleteMessageHandler(req, res) {
    try {
      const { messageId, senderId } = req.body;

      const message = await MessageRepository.findOne({ id: messageId });

      if (!message) {
        return res.status(404).json({ error: "Message not found" });
      }

      // Kiểm tra quyền xóa
      if (message.senderId.toString() !== senderId.toString()) {
        return res
          .status(403)
          .json({ error: "You do not have permission to delete this message" });
      }

      // Cập nhật trạng thái message là deleted
      const deletedMessage = await MessageRepository.delete(messageId);

      return res.status(200).json({
        success: true,
        message: "Message deleted successfully",
        data: deletedMessage,
      });
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
