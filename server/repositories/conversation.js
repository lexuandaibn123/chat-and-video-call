const Conversation = require("../models/conversation");
class ConversationRepository {
  async create(data) {
    return await Conversation.create(data);
  }

  async findById(id) {
    return await Conversation.findOne({ _id: id, isDeleted: false })
      .populate(
        "members.id",
        "-password -verificationToken -resetToken -resetTokenExpiry"
      )
      .populate("latestMessage");
  }

  async updateById(id, data) {
    return await Conversation.findByIdAndUpdate(id, { ...data }, { new: true });
  }

  async findByName(userId, name, page = 1, limit = 10) {
    return await Conversation.find({
      name: { $regex: name, $options: "i" },
      members: {
        $elemMatch: {
          id: userId,
        },
      },
      isDeleted: false,
    })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate(
        "members.id",
        "-password -verificationToken -resetToken -resetTokenExpiry"
      )
      .populate("latestMessage");
  }

  async findByUserId(userId, page = 1, limit = 10) {
    return Conversation.find({
      isDeleted: false,
      members: {
        $elemMatch: {
          id: userId,
        },
      },
    })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate(
        "members.id",
        "-password -verificationToken -resetToken -resetTokenExpiry"
      )
      .populate("latestMessage")
      .sort({ last_updated: -1 });
  }

  async findConversationBetweenUsers(userId1, userId2) {
    const conversation = await Conversation.findOne({
      isGroup: false,
      isDeleted: false,
      members: {
        $size: 2,
        $all: [
          { $elemMatch: { id: userId1 } },
          { $elemMatch: { id: userId2 } },
        ],
      },
    });

    return conversation;
  }

  async addMember(conversationId, userObj) {
    return await Conversation.findByIdAndUpdate(
      conversationId,
      { $push: { members: userObj } },
      { new: true }
    );
  }

  async removeMember(conversationId, userId) {
    const conversation = await this.findById(conversationId);
    const memberIndex = conversation.members.findIndex(
      (member) => member.id.toString() === userId.toString()
    );

    if (memberIndex !== -1) {
      conversation.members[memberIndex].leftAt = new Date();
      await conversation.save();
    }
    return conversation;
  }

  async updateRole(conversationId, userId, newRole) {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    const member = conversation.members.find(
      (member) => member.id.toString() === userId.toString() && !member.leftAt
    );
    if (!member) {
      throw new Error("Member not found or has been deleted");
    }

    member.role = newRole;
    await conversation.save();
    return conversation;
  }

  async deleteConversationByMemberId(conversationId, userId) {
    return await Conversation.findByIdAndUpdate(
      conversationId,
      {
        $set: {
          "members.$[elem].leftAt": new Date(),
        },
      },
      {
        arrayFilters: [{ "elem.id": userId }],
        new: true,
      }
    );
  }
}

module.exports = new ConversationRepository();
