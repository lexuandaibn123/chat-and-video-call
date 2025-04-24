const Message = require("../models/message.model");

class MessageRepository {
  async createMessage(data) {
    const message = new Message(data);
    return message.save();
  }

  async getLastMessagesByRooms(roomIds) {
    const messages = await Message.aggregate([
      { $match: { conversationId: { $in: roomIds } } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$conversationId",
          lastMessage: { $first: "$$ROOT" },
        },
      },
      {
        $project: {
          roomId: "$_id",
          lastMessage: "$lastMessage",
          _id: 0,
        },
      },
    ]);
  
    return messages;
  }
  

  async  findByConversationId(conversationId, limit = 10, skip = 0) {
    return Message.find({ conversationId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
  }
  

  async updateMessage(messageId, updateData) {
    return Message.findByIdAndUpdate(messageId, updateData, { new: true });
  }

  async deleteMessage(messageId) {
    return Message.findByIdAndDelete(messageId);
  }

  async getMessageById(messageId) {
    return Message.findById(messageId);
  }
  async setLastMessage(conversationId, messageId) {
    return Conversation.findByIdAndUpdate(
      conversationId,
      { lastMessage: messageId, updatedAt: Date.now() },
      { new: true }
    );
  }
}

module.exports = new MessageRepository();
