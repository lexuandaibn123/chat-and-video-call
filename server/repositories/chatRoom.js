const ChatRoom = require("../models/chatRoom");

class ChatRoomRepository {
  async create(data) {
    return await ChatRoom.create(data);
  }

  async findById(id) {
    return await ChatRoom.findById(id).populate("members");
  }

  async findRoomsByName(name) {
    return await ChatRoom.find({
      name: { $regex: name, $options: "i" },
    });
  }

  async getRoomByUserId(userId) {
    return await ChatRoom.find({ members: userId });
  }

  // async changeLeader(roomId, newLeaderId) {
  //   return await ChatRoom.findByIdAndUpdate(
  //     roomId,
  //     { leader: newLeaderId },
  //     { new: true }
  //   );
  // }
  async addMember(roomId, userId) {
    return await ChatRoom.findByIdAndUpdate(
      roomId,
      { $addToSet: { members: userId } },
      { new: true }
    );
  }
  async removeMember(roomId, userId) {
    return await ChatRoom.findByIdAndUpdate(
      roomId,
      { $pull: { members: userId } },
      { new: true }
    );
  }
}

module.exports = new ChatRoomRepository();
