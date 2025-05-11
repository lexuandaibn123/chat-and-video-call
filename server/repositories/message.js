const Message = require("../models/message");
const Conversation = require("../models/conversation");
class MessageRepository {
  async create(data) {
    return await Message.create(data);
  }

  async findById(id) {
    return await Message.findOne({ _id: id }).populate(
      "senderId",
      "-password -verificationToken -resetToken -resetTokenExpiry"
    );
  }

  async updateById(id, data) {
    return await Message.findByIdAndUpdate(id, { ...data }, { new: true });
  }

  async findByConversationId(conversationId, limit = 30, skip = 0) {
    return Message.find({ conversationId })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
  }

  async findByConversationIdAndUserId(
    conversationId,
    userId,
    limit = 30,
    skip = 0,
    latestDeletedAt = null,
    leftAt = null
  ) {
    let query = { conversationId };

    if (latestDeletedAt || leftAt) {
      query.last_updated = {};
      if (latestDeletedAt) {
        query.last_updated.$gte = latestDeletedAt; // Greater than or equal to latestDeletedAt
      }
      if (leftAt) {
        query.last_updated.$lte = leftAt; // Less than or equal to leftAt
      }
    }

    const messages = await Message.find(query)
      .sort({ datetime_created: -1 })
      .skip(skip)
      .limit(limit);

    return messages;
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
