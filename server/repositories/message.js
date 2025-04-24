const Message = require("../models/message.model");

class MessageRepository {
  async createMessage(data) {
    const message = new Message(data);
    return message.save();
  }

  async getMessagesByConversation(conversationId, limit = 20, skip = 0) {
    Message.find({ conversationId })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
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
