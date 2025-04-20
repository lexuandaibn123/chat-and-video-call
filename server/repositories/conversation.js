const Conversation = require("../models/conversation");

class ConversationRepository {
  async create(data) {
    return await Conversation.create(data);
  }

  async findById(id) {
    return await Conversation.findById(id).populate("members");
  }

  async findRoomsByName(name, page = 1, limit = 10) {
    return await Conversation.find({
      name: { $regex: name, $options: "i" },
    })
      .skip((page - 1) * limit) // Bỏ qua các bản ghi đã có trong các trang trước
      .limit(limit) // Giới hạn số bản ghi mỗi trang
      .populate("members");
  }

  async getRoomByUserId(userId, page = 1, limit = 10) {
    return await Conversation.find({ members: userId })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("members");
  }

  async addMember(roomId, userId) {
    return await Conversation.findByIdAndUpdate(
      roomId,
      { $addToSet: { members: userId } },
      { new: true }
    );
  }
  async removeMember(roomId, userId) {
    return await Conversation.findByIdAndUpdate(
      roomId,
      { $pull: { members: userId } },
      { new: true }
    );
  }

  async setCallingStatus(roomId, isCalling) {
    return await Conversation.findByIdAndUpdate(
      roomId,
      { isCalling, updatedAt: new Date() },
      { new: true }
    );
  }

  async updateRoomName(roomId, newName) {
    return await Conversation.findByIdAndUpdate(
      roomId,
      { name: newName, updatedAt: new Date() },
      { new: true }
    );
  }
}

module.exports = new ConversationRepository();
