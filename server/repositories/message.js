const Message = require("../models/message");

const MessageRepository = {
  // Tạo tin nhắn mới
  async create(messageData) {
    const message = new Message(messageData);
    return await message.save();
  },

  // Lấy tất cả tin nhắn của một phòng
  async findByRoomId(roomId) {
    return await Message.find({ room: roomId }).sort({ timestamp: 1 });
  },

  // Lấy 1 tin nhắn theo ID
  async findById(messageId) {
    return await Message.findById(messageId);
  },

  // Xoá tin nhắn
  async delete(messageId) {
    return await Message.findByIdAndDelete(messageId);
  },

  // Sửa nội dung tin nhắn
  async update(messageId, updatedData) {
    return await Message.findByIdAndUpdate(messageId, updatedData, {
      new: true,
    });
  },

  // Lấy tin nhắn mới nhất trong phòng
  async getLastMessagesByRooms(roomIds) {
    return await Message.aggregate([
      { $match: { room: { $in: roomIds } } },
      { $group: { _id: "$room", lastMessage: { $last: "$$ROOT" } } },
      { $project: { roomId: "$_id", message: "$lastMessage", _id: 0 } },
    ]);
  },
};

module.exports = MessageRepository;
