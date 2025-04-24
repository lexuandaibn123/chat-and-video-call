const { validationResult } = require("express-validator");
const MessageRepository = require("../repositories/message");

class MessageService {
  async createMessage(req, res) {
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

      if (data.text) {
        content.text = { text: data.text };
      }

      if (data.url) {
        content.image = {
          image_url: { url: data.url },
          metadata: data.metadata || null,
        };
      }

      if (data.data) {
        content.audio = {
          input_audio: { data: data.data },
          metadata: data.metadata || null,
        };
      }

      if (data.file_data && data.filename) {
        content.file = {
          file: {
            file_data: data.file_data,
            file_id: data.file_id || null,
            filename: data.filename,
          },
          metadata: data.metadata || null,
        };
      }

      if (Object.keys(content).length === 0) {
        return res
          .status(400)
          .json({ error: "No valid message content provided" });
      }

      const newMessage = {
        ...baseData,
        content,
      };

      const savedMessage = await MessageRepository.createMessage(newMessage);

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

  async getMessages(req, res) {
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

  async updateMessage(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array() });
      }

      const { id } = req.params;
      const { data } = req.body;

      if (!data) {
        return res.status(400).json({ error: "No update data provided" });
      }

      const message = await MessageRepository.findById(id);
      if (!message) {
        return res.status(404).json({ error: "Message not found" });
      }

      const updatedContent = { ...message.content };

      if (data.text) {
        updatedContent.text = { text: data.text };
      }

      if (data.url) {
        updatedContent.image = {
          image_url: { url: data.url },
          metadata: data.metadata || null,
        };
      }

      if (data.data) {
        updatedContent.audio = {
          input_audio: { data: data.data },
          metadata: data.metadata || null,
        };
      }

      if (data.file_data && data.filename) {
        updatedContent.file = {
          file: {
            file_data: data.file_data,
            file_id: data.file_id || null,
            filename: data.filename,
          },
          metadata: data.metadata || null,
        };
      }

      if (Object.keys(updatedContent).length === 0) {
        return res
          .status(400)
          .json({ error: "No valid message content to update" });
      }

      const updatedMessage = await MessageRepository.update(id, {
        content: updatedContent,
      });

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

  async deleteMessage(req, res) {
    try {
      const { messageId, senderId } = req.body;

      const message = await MessageRepository.findOne({ id: messageId });

      if (!message) {
        return res.status(404).json({ error: "Message not found" });
      }

      if (message.senderId.toString() !== senderId.toString()) {
        return res
          .status(403)
          .json({ error: "You do not have permission to delete this message" });
      }

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

      const messages = await MessageRepository.getLastMessagesByRooms(roomIds);

      return res.status(200).json({ success: true, messages });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
}

module.exports = new MessageService();
