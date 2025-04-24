const Conversation = require("../models/conversation");

class ConversationRepository {
  async create(data) {
    return await Conversation.create(data);
  }

  async findById(id) {
    return await Conversation.findById(id).populate("members");
  }

  async findByName(name, page = 1, limit = 10) {
    return await Conversation.find({
      name: { $regex: name, $options: "i" },
    })
      .skip((page - 1) * limit) 
      .limit(limit) 
      .populate("members");
  }

  async getRoomByUserId(userId, page = 1, limit = 10) {
    return await Conversation.find({ "members.id": userId })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("members.id");
  }

  async addMember(roomId, userObj) {
    return await Conversation.findByIdAndUpdate(
      roomId,
      { $addToSet: { members: userObj } },
      { new: true }
    );
  }

  async removeMember(roomId, userId) {
    return await Conversation.findByIdAndUpdate(
      roomId,
      { $pull: { members: { id: userId } } },
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
  async  updateLeaders(conversationId, userId, action) {
    const update = action === "remove"
      ? { $set: { "members.$[elem].role": "member" } }
      : { $set: { "members.$[elem].role": "leader" } };
  
    const options = {
      arrayFilters: [{ "elem.id": userId }],
      new: true,
    };
  
    return await Conversation.findByIdAndUpdate(conversationId, update, options);
  }
  
  async transferLeadership(conversationId, requesterId, newLeaderId) {
    return await Conversation.findOneAndUpdate(
      { _id: conversationId },
      {
        $set: {
          "members.$[from].role": "member",
          "members.$[to].role": "leader",
        },
      },
      {
        arrayFilters: [
          { "from.id": requesterId },
          { "to.id": newLeaderId },
        ],
        new: true,
      }
    );
  }
  async updateMemberRole(conversationId, userId, newRole) {
    return await Conversation.findByIdAndUpdate(
      conversationId,
      {
        $set: { "members.$[elem].role": newRole },
      },
      {
        arrayFilters: [{ "elem.id": userId }],
        new: true,
      }
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
