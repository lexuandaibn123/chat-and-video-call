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
    latestDeletedAt = null
  ) {
    let query = { conversationId };

    if (latestDeletedAt) {
      query.last_updated = { $gt: latestDeletedAt };
    }

    const messages = await Message.find(query)
      .sort({ datetime_created: -1 })
      .skip(skip)
      .limit(limit);

    return messages;
  }
}

module.exports = new MessageRepository();
