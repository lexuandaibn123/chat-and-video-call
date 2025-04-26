const ConversationRepository = require("../repositories/conversation");
const UserRepository = require("../repositories/user");
const MessageRepository = require("../repositories/message");
class ConversationService {
  async _mustBeValidConversation(conversationId, mustBeGroup = false) {
    const conversation = await ConversationRepository.findById(conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }
    if (mustBeGroup && !conversation.isGroup) {
      throw new Error("Conversation must be a group conversation");
    }
    conversation.members = conversation.members.filter(
      (member) => member.leftAt === null
    );
    return conversation;
  }

  async _mustBeValidMessage(messageId) {
    const message = await MessageRepository.findById(messageId);
    if (!message || message.isDeleted) {
      throw new Error("Message not found");
    }
    return message;
  }

  _isOwnerOfMessage(message, userId) {
    if (typeof message.senderId === "string")
      return message.senderId.toString() == userId;
    else if (typeof message.senderId === "object")
      return message.senderId._id.toString() == userId;
    else throw new Error("Invalid message");
  }

  _mustBeOwnerOfMessage(message, userId, errorMsg = "") {
    if (!this._isOwnerOfMessage(message, userId)) {
      if (errorMsg.length > 0) throw new Error(errorMsg);
      throw new Error("You are not the owner of this message");
    }
  }

  _isMemberOfConversation(conversation, userId) {
    return conversation.members.find((member) => {
      return (
        (typeof member.id == "object"
          ? member.id._id.toString() == userId
          : member.id.toString() == userId) && member.leftAt == null
      );
    });
  }

  _mustBeMemberOfConversation(conversation, userId, errorMsg = "") {
    const member = this._isMemberOfConversation(conversation, userId);
    if (!member) {
      if (errorMsg.length > 0) throw new Error(errorMsg);
      throw new Error(`User ${userId} is not a member of the conversation`);
    }
    return member;
  }

  _isLeaderOfConversation(conversation, userId) {
    return conversation.members.find(
      (member) =>
        (typeof member.id == "object"
          ? member.id._id.toString() == userId
          : member.id.toString() == userId) &&
        member.role === "leader" &&
        member.leftAt == null
    );
  }

  _mustBeLeaderOfConversation(conversation, userId, errorMsg = "") {
    const leader = this._isLeaderOfConversation(conversation, userId);
    if (!leader) {
      if (errorMsg.length > 0) throw new Error(errorMsg);
      throw new Error(`User ${userId} is not a leader of the conversation`);
    }
    return leader;
  }

  _filterMembersLeft(conversation) {
    conversation.members = conversation.members.filter(
      (member) => member.leftAt === null
    );
  }

  async createConversation(req, res) {
    try {
      const { members = [], name = "" } = req.body;

      const userInfo = req.session.userInfo;

      const creatorId = userInfo.id.toString();

      const memberIds = [...members];

      if (!members.includes(creatorId)) {
        memberIds.push(creatorId);
      }

      const users = await UserRepository.findByIds(memberIds);
      if (users.length !== memberIds.length) {
        throw new Error("One or more users do not exist");
      }

      if (memberIds.length < 2) {
        return res
          .status(400)
          .json({ error: "Conversation must have at least 2 members." });
      }

      if (memberIds.length == 2) {
        const existingConversation =
          await ConversationRepository.findConversationBetweenUsers(
            memberIds[0],
            memberIds[1]
          );

        if (existingConversation) {
          return res.status(400).json({
            error: "Conversation already exists between these two users.",
          });
        }
      }

      const isGroup = memberIds.length > 2;

      const membersInfo = memberIds.map((userId) => {
        const role = isGroup && userId == creatorId ? "leader" : "member";
        return {
          id: userId,
          role,
          joinedAt: new Date(),
          leftAt: null,
          latestDeletedAt: null,
        };
      });

      const conversation = await ConversationRepository.create({
        isGroup,
        members: membersInfo,
        name: name ?? "",
      });

      return res.status(200).json({
        success: true,
        data: conversation,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  async fetchConversations(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const userInfo = req.session.userInfo;

      const userId = userInfo.id.toString();
      const conversations = await ConversationRepository.findByUserId(
        userId,
        page,
        limit
      );

      return res.status(200).json({
        success: true,
        data: conversations.map((conversation) => {
          this._filterMembersLeft(conversation);
          return conversation;
        }),
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  async fetchConversationsByWs({ userId, page = 1, limit = 10 }) {
    try {
      const conversations = await ConversationRepository.findByUserId(
        userId,
        page,
        limit
      );

      return conversations;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async searchByName(req, res) {
    try {
      const { name } = req.query;
      const { page = 1, limit = 10 } = req.query;

      const userInfo = req.session.userInfo;

      const conversations = await ConversationRepository.findByName(
        userInfo.id.toString(),
        name,
        page,
        limit
      );
      return res.status(200).json({
        success: true,
        data: conversations.map((conversation) => {
          this._filterMembersLeft(conversation);
          return conversation;
        }),
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  async addNewMember(req, res) {
    try {
      const { conversationId, newMemberId, role = "member" } = req.body;

      try {
        const conversation = await this._mustBeValidConversation(
          conversationId,
          true
        );

        const isAlreadyMember = this._isMemberOfConversation(
          conversation,
          newMemberId
        );
        if (isAlreadyMember) {
          return res.status(400).json({
            error: "User is already a member of the conversation",
          });
        }
        const member = await UserRepository.findById(newMemberId);
        if (!member) {
          return res.status(404).json({ error: "User not found" });
        }

        const memberObj = {
          id: newMemberId,
          role,
          joinedAt: new Date(),
          leftAt: null,
          latestDeletedAt: null,
        };

        const updatedConversation = await ConversationRepository.addMember(
          conversationId,
          memberObj
        );

        if (!updatedConversation) {
          return res.status(400).json({ error: "Failed to add new member" });
        }

        this._filterMembersLeft(updatedConversation);

        return res.status(200).json({
          success: true,
          message: "Added new member successfully",
          data: updatedConversation,
        });
      } catch (error) {
        console.error(error);
        return res.status(400).json({ error: error.message });
      }
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  async removeMember(req, res) {
    try {
      const { conversationId, memberId } = req.body;

      const userInfo = req.session.userInfo;

      try {
        const conversation = await this._mustBeValidConversation(
          conversationId,
          true
        );

        this._mustBeMemberOfConversation(
          conversation,
          memberId,
          "User is not a member of the conversation"
        );

        this._mustBeLeaderOfConversation(
          conversation,
          userInfo.id,
          "You must be a leader of the conversation to remove a member"
        );

        const updatedConversation = await ConversationRepository.removeMember(
          conversationId,
          memberId
        );

        return res.status(200).json({
          success: true,
          message: "Removed member successfully",
          data: updatedConversation,
        });
      } catch (error) {
        console.error(error);
        return res.status(400).json({ error: error.message });
      }
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  async leaveConversation(req, res) {
    try {
      const { conversationId } = req.body;

      const userInfo = req.session.userInfo;

      try {
        const conversation = await this._mustBeValidConversation(
          conversationId,
          true
        );

        const userObj = this._mustBeMemberOfConversation(
          conversation,
          userInfo.id,
          "You are not a member of the conversation"
        );

        const numberOfLeader = conversation.members.filter(
          (member) => member.role == "leader" && member.leftAt == null
        ).length;

        const userRole = userObj.role;

        if (userRole == "leader" && numberOfLeader <= 1) {
          const firstMember = conversation.members.find(
            (member) =>
              member.id.toString() != userInfo.id && member.leftAt == null
          );
          if (!firstMember) {
            return res.status(400).json({
              error:
                "You are the last member, you can't leave the conversation",
            });
          }
          await ConversationRepository.updateRole(
            conversationId,
            firstMember.id,
            "leader"
          );
        }
        await ConversationRepository.removeMember(conversationId, userInfo.id);

        return res.status(200).json({
          success: true,
          message: "Left conversation successfully",
        });
      } catch (error) {
        console.error(error);
        return res.status(400).json({ error: error.message });
      }
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  async deleteConversationByMember(req, res) {
    try {
      const { conversationId } = req.body;

      const userInfo = req.session.userInfo;

      try {
        const conversation = await this._mustBeValidConversation(
          conversationId,
          false
        );

        this._mustBeMemberOfConversation(
          conversation,
          userInfo.id,
          "You are not a member of the conversation"
        );

        await ConversationRepository.deleteConversationByMemberId(
          conversationId,
          userInfo.id
        );

        return res.status(200).json({
          success: true,
          message: "Deleted conversation successfully",
        });
      } catch (error) {
        console.error(error);
        return res.status(400).json({ error: error.message });
      }
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  async deleteConversationByLeader(req, res) {
    try {
      const { conversationId } = req.body;

      const userInfo = req.session.userInfo;

      try {
        const conversation = await this._mustBeValidConversation(
          conversationId,
          true
        );

        this._mustBeLeaderOfConversation(
          conversation,
          userInfo.id,
          "You are not a leader of the conversation"
        );

        await ConversationRepository.updateById(conversationId, {
          isDeleted: true,
        });

        return res.status(200).json({
          success: true,
          message: "Deleted conversation successfully",
        });
      } catch (error) {
        console.error(error);
        return res.status(400).json({ error: error.message });
      }
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
  async updateMemberRole(req, res) {
    try {
      const { conversationId, memberId, newRole } = req.body;

      const userInfo = req.session.userInfo;

      try {
        const conversation = await this._mustBeValidConversation(
          conversationId,
          true
        );
        this._mustBeLeaderOfConversation(
          conversation,
          userInfo.id,
          "You are not a leader of the conversation"
        );
        const memberObj = this._mustBeMemberOfConversation(
          conversation,
          memberId,
          "User is not a member of the conversation"
        );

        const memberRole = memberObj.role;

        if (memberRole == "leader") {
          return res.status(400).json({
            error: "You can't change the role of the leader",
          });
        }

        const updatedConversation = await ConversationRepository.updateRole(
          conversationId,
          memberId,
          newRole
        );

        return res.status(200).json({
          success: true,
          message: "Updated member role successfully",
          conversation: updatedConversation,
        });
      } catch (error) {
        console.error(error);
        return res.status(400).json({ error: error.message });
      }
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
  async updateConversationName(req, res) {
    try {
      const { conversationId, newName } = req.body;

      const userInfo = req.session.userInfo;

      try {
        const conversation = await this._mustBeValidConversation(
          conversationId,
          true
        );

        this._mustBeMemberOfConversation(
          conversation,
          userInfo.id,
          "You are not a member of the conversation"
        );
        const updatedConversation = await ConversationRepository.updateById(
          conversationId,
          {
            name: newName,
          }
        );

        return res.status(200).json({
          success: true,
          message: "Updated conversation name successfully",
          conversation: updatedConversation,
        });
      } catch (error) {
        console.error(error);
        return res.status(400).json({ error: error.message });
      }
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  async fetchMessages(req, res) {
    try {
      const { conversationId, limit = 30, skip = 0 } = req.body;

      const userInfo = req.session.userInfo;

      try {
        const conversation = await this._mustBeValidConversation(
          conversationId,
          false
        );

        const userObj = this._mustBeMemberOfConversation(
          conversation,
          userInfo.id,
          "You are not a member of the conversation"
        );

        const latestDeletedAt = userObj.latestDeletedAt;

        const messages = await MessageRepository.findByConversationIdAndUserId(
          conversationId,
          userInfo.id,
          limit,
          skip,
          latestDeletedAt
        );

        return res.status(200).json({
          success: true,
          data: messages,
        });
      } catch (error) {
        console.error(error);
        return res.status(400).json({ error: error.message });
      }
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  async createNewMessage(req, res) {
    try {
      const { conversationId, data, type, replyToMessageId = null } = req.body;

      // data phải có type là TextPartSchema | [ImagePartSchema] | FilePartSchema

      const userInfo = req.session.userInfo;

      try {
        const conversation = await this._mustBeValidConversation(
          conversationId,
          false
        );

        this._mustBeMemberOfConversation(
          conversation,
          userInfo.id,
          "You are not a member of the conversation"
        );

        let messageObj = {
          conversationId: conversationId,
          senderId: userInfo.id,
          replyToMessageId,
        };

        switch (type) {
          case "text":
            messageObj.type = "text";
            messageObj.content = {};
            messageObj.content.text = { ...data };
            break;
          case "image":
            messageObj.type = "image";
            messageObj.content = {};
            messageObj.content.image = [...data];
            break;
          case "file":
            messageObj.type = "file";
            messageObj.content = {};
            messageObj.content.file = { ...data };
            break;
          default:
            return res.status(400).json({ error: "Invalid message type" });
        }

        const message = await MessageRepository.create(messageObj);

        await ConversationRepository.updateById(conversationId, {
          latestMessage: message._id,
        });

        return res.status(200).json({
          success: true,
          message: "Message created successfully",
          data: message,
        });
      } catch (error) {
        console.error(error);
        return res.status(400).json({ error: error.message });
      }
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  async createNewMessageByWs({
    userId,
    conversationId,
    data,
    type,
    replyToMessageId = null,
  }) {
    try {
      const isValidType = ["text", "image", "file"].includes(type);
      if (!isValidType) throw new Error("Invalid message type");

      if (
        Array.isArray(data) &&
        !data.reduce((a, b) => a && b.type == "image", true)
      ) {
        throw new Error("Invalid message data");
      }
      if (
        typeof data === "object" &&
        !(data.type == "text" || data.type == "file")
      ) {
        throw new Error("Invalid message data");
      }

      const conversation = await this._mustBeValidConversation(
        conversationId,
        false
      );

      this._mustBeMemberOfConversation(
        conversation,
        userId,
        "You are not a member of the conversation"
      );

      let messageObj = {
        conversationId: conversationId,
        senderId: userInfo.id,
        replyToMessageId,
      };

      switch (type) {
        case "text":
          messageObj.type = "text";
          messageObj.content = {};
          messageObj.content.text = { ...data };
          break;
        case "image":
          messageObj.type = "image";
          messageObj.content = {};
          messageObj.content.image = [...data];
          break;
        case "file":
          messageObj.type = "file";
          messageObj.content = {};
          messageObj.content.file = { ...data };
          break;
        default:
          throw new Error("Invalid message type");
      }

      const message = await MessageRepository.create(messageObj);

      await ConversationRepository.updateById(conversationId, {
        latestMessage: message._id,
      });

      return message;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async editMessage(req, res) {
    try {
      const { messageId, newData } = req.body;

      // newData must be string

      const userInfo = req.session.userInfo;

      try {
        const message = await this._mustBeValidMessage(messageId);

        if (message.type != "text")
          throw new Error("Cannot edit this type of message");

        this._mustBeOwnerOfMessage(
          message,
          userInfo.id,
          "You are not the owner of this message"
        );

        const newContent = {
          text: {
            type: "text",
            data: newData,
          },
        };

        const updatedMessage = await MessageRepository.updateById(messageId, {
          content: { ...newContent },
          isEdited: true,
        });

        return res.status(200).json({
          success: true,
          message: "Message updated successfully",
          data: updatedMessage,
        });
      } catch (error) {
        console.error(error);
        return res.status(400).json({ error: error.message });
      }
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  async deleteMessage(req, res) {
    try {
      const { messageId } = req.body;

      const userInfo = req.session.userInfo;

      try {
        const message = await this._mustBeValidMessage(messageId);

        this._mustBeOwnerOfMessage(
          message,
          userInfo.id,
          "You are not the owner of this message"
        );

        const updatedMessage = await MessageRepository.updateById(messageId, {
          isDeleted: true,
          content: null,
        });

        return res.status(200).json({
          success: true,
          message: "Message deleted successfully",
          data: updatedMessage,
        });
      } catch (error) {
        console.error(error);
        return res.status(400).json({ error: error.message });
      }
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
}

module.exports = new ConversationService();
