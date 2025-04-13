const Message = require("../models/message");

class MessageRepository {
  async create(data) {
    return await Message.create(data);
  }

  async getMessagesByRoomId(roomId) {
    return await Message.find({ chatRoom: roomId })
      .populate("sender", "fullName email")
      .sort({ createdAt: 1 });
  }
}

module.exports = new MessageRepository();
