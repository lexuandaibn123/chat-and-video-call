const conversationRepo = require("../repositories/conversation");
const messageRepo = require("../repositories/message");
const userRepo = require("../repositories/user");

class ConversationService {
  async create11Conversation(req, res) {
    try {
      const { creatorId } = req.body;
      const { members = [] } = req.body;

      if (members.length !== 1) {
        return res
          .status(400)
          .json({ error: "Chat 1-1 chỉ có đúng 2 thành viên" });
      }

      const partnerId = members[0];
      const partnerUser = await userRepo.findById(partnerId);
      if (!partnerUser) {
        return res.status(404).json({ error: "Người dùng không tồn tại" });
      }

      const uniqueMemberIds = [creatorId, partnerId];
      const memberDocs = uniqueMemberIds.map((id) => ({ id }));

      const conversation = await conversationRepo.create({
        name: partnerUser.name,
        isGroup: false,
        members: memberDocs,
        lastMessage: null,
        isCalling: false,
        isDeleted: false,
      });

      return res.status(201).json({
        success: true,
        message: "Tạo cuộc trò chuyện 1-1 thành công",
        data: conversation,
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ error: "Lỗi hệ thống" });
    }
  }

  async createGroupConversation(req, res) {
    try {
      const { creatorId } = req.body;
      const { name, members } = req.body;

      if (members.length < 3) {
        return res
          .status(400)
          .json({ error: "Nhóm phải có ít nhất 3 thành viên." });
      }

      const uniqueMemberIds = [...new Set([...members, creatorId])];
      const memberDocs = uniqueMemberIds.map((id) => ({
        id,
        role: id === creatorId ? "leader" : "member",
      }));

      const conversation = await conversationRepo.create({
        name,
        isGroup: true,
        members: memberDocs,
        lastMessage: null,
        isCalling: false,
        isDeleted: false,
      });

      return res.status(201).json({
        success: true,
        message: "Tạo nhóm trò chuyện thành công",
        data: conversation,
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ error: "Lỗi hệ thống" });
    }
  }

  // Gọi khi mới click vào 1 conver
  async getConversationById(req, res) {
    try {
      const { id } = req.params;

      const conversation = await conversationRepo.findById(id);
      if (!conversation) {
        return res.status(404).json({ error: "Phòng không tồn tại" });
      }

      const messages = await messageRepo.findById(id, 20, 0);

      return res.status(200).json({
        success: true,
        data: {
          ...conversation.toObject(),
          messages,
        },
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ error: "Lỗi hệ thống" });
    }
  }

  async searchByName(req, res) {
    try {
      const { name } = req.query;
      const { page = 1, limit = 10 } = req.query;

      const conversations = await conversationRepo.findByName(
        name,
        page,
        limit
      );
      return res.status(200).json({
        success: true,
        data: conversations,
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ error: "Lỗi hệ thống" });
    }
  }

  async getUserConversations(req, res) {
    try {
      const { userId } = req.params;

      const conversations = await conversationRepo.getUserConversations(userId);
      return res.status(200).json({
        success: true,
        data: conversations,
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ error: "Lỗi hệ thống" });
    }
  }

  async addMember(req, res) {
    try {
      const { conversationId, userIdToAdd, role = "member" } = req.body;
      const { requesterId } = req.params;

      const conversation = await this.getConversationById(
        req,
        res,
        conversationId
      );

      if (!conversation.isGroup) {
        return res
          .status(400)
          .json({ error: "Không thể thêm thành viên vào chat 1-1" });
      }

      const isLeader = conversation.members.some(
        (m) => m.id.equals(requesterId) && m.role === "leader"
      );
      if (!isLeader) {
        return res
          .status(403)
          .json({ error: "Chỉ leader mới có quyền thêm thành viên" });
      }

      const updatedConversation = await conversationRepo.addMember(
        conversationId,
        userIdToAdd,
        role
      );

      return res.status(200).json({
        success: true,
        message: "Thêm thành viên thành công",
        data: updatedConversation,
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ error: "Lỗi hệ thống" });
    }
  }

  async removeMember(req, res) {
    try {
      const { conversationId, userIdToRemove } = req.body;
      const { requesterId } = req.params;

      const conversation = await this.getConversationById(
        req,
        res,
        conversationId
      );

      if (!conversation.isGroup) {
        return res
          .status(400)
          .json({ error: "Không thể xóa thành viên khỏi chat 1-1" });
      }

      const isLeader = conversation.members.some(
        (m) => m.id.equals(requesterId) && m.role === "leader"
      );
      if (!isLeader) {
        return res
          .status(403)
          .json({ error: "Chỉ leader mới có quyền xóa thành viên" });
      }

      const updatedConversation = await conversationRepo.removeMember(
        conversationId,
        userIdToRemove
      );

      return res.status(200).json({
        success: true,
        message: "Xóa thành viên thành công",
        data: updatedConversation,
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ error: "Lỗi hệ thống" });
    }
  }

  async leaveConversation(req, res) {
    try {
      const { conversationId } = req.body;
      const { userId } = req.params;

      const conversation = await this.getConversationById(
        req,
        res,
        conversationId
      );

      if (!conversation.isGroup) {
        return res.status(400).json({ error: "Không thể rời khỏi chat 1-1" });
      }

      const member = conversation.members.find((m) => m.id.equals(userId));
      if (!member) {
        return res
          .status(400)
          .json({ error: "Bạn không phải thành viên phòng này" });
      }

      if (member.role === "leader") {
        const totalLeaders = conversation.members.filter(
          (m) => m.role === "leader"
        ).length;
        if (totalLeaders <= 1) {
          return res.status(400).json({
            error:
              "Bạn là leader cuối cùng, hãy chuyển quyền trước khi rời nhóm",
          });
        }
        await conversationRepo.updateLeaders(conversationId, userId, "remove");
      }

      await conversationRepo.removeMember(conversationId, userId);

      return res.status(200).json({
        success: true,
        message: "Rời nhóm thành công",
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ error: "Lỗi hệ thống" });
    }
  }

  async deleteConversation(req, res) {
    try {
      const { conversationId } = req.body;
      const { requesterId } = req.params;

      const conversation = await this.getConversationById(
        req,
        res,
        conversationId
      );

      const isLeader = conversation.members.some(
        (m) => m.id.equals(requesterId) && m.role === "leader"
      );
      if (!isLeader) {
        return res
          .status(403)
          .json({ error: "Chỉ leader mới có quyền xóa nhóm" });
      }

      await conversationRepo.deleteConversation(conversationId);

      return res.status(200).json({
        success: true,
        message: "Xóa nhóm thành công",
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ error: "Lỗi hệ thống" });
    }
  }

  async transferLeadership(req, res) {
    try {
      const { conversationId, newLeaderId } = req.body;
      const { requesterId } = req.params;

      const conversation = await this.getConversationById(
        req,
        res,
        conversationId
      );

      const isLeader = conversation.members.some(
        (m) => m.id.equals(requesterId) && m.role === "leader"
      );
      if (!isLeader) {
        return res.status(403).json({
          error: "Chỉ leader mới có quyền chuyển quyền quản lý",
        });
      }

      const updatedConversation = await conversationRepo.transferLeadership(
        conversationId,
        requesterId,
        newLeaderId
      );

      return res.status(200).json({
        success: true,
        message: "Chuyển quyền quản lý thành công",
        data: updatedConversation,
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ error: "Lỗi hệ thống" });
    }
  }

  async updateRoomName(req, res) {
    try {
      const { conversationId, newName } = req.body;
      const { requesterId } = req.params;

      const conversation = await this.getConversationById(
        req,
        res,
        conversationId
      );

      const isLeader = conversation.members.some(
        (m) => m.id.equals(requesterId) && m.role === "leader"
      );
      if (!isLeader) {
        return res
          .status(403)
          .json({ error: "Chỉ leader mới có quyền đổi tên nhóm" });
      }

      const updatedConversation = await conversationRepo.updateRoomName(
        conversationId,
        newName
      );

      return res.status(200).json({
        success: true,
        message: "Đổi tên nhóm thành công",
        data: updatedConversation,
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ error: "Lỗi hệ thống" });
    }
  }

  async addLeader(req, res) {
    try {
      const { conversationId, userIdToPromote } = req.body;
      const { requesterId } = req.params;

      const conversation = await this.getConversationById(
        req,
        res,
        conversationId
      );

      if (!conversation.isGroup) {
        return res.status(400).json({ error: "Chỉ nhóm mới có leader" });
      }

      const isLeader = conversation.members.some(
        (m) => m.id.equals(requesterId) && m.role === "leader"
      );
      if (!isLeader) {
        return res
          .status(403)
          .json({ error: "Chỉ leader mới có quyền thêm leader" });
      }

      const targetMember = conversation.members.find((m) =>
        m.id.equals(userIdToPromote)
      );
      if (!targetMember) {
        return res
          .status(400)
          .json({ error: "Người này không phải thành viên" });
      }

      if (targetMember.role === "leader") {
        return res.status(400).json({ error: "Người này đã là leader" });
      }

      const updatedConversation = await conversationRepo.updateMemberRole(
        conversationId,
        userIdToPromote,
        "leader"
      );

      return res.status(200).json({
        success: true,
        message: "Thêm leader thành công",
        data: updatedConversation,
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ error: "Lỗi hệ thống" });
    }
  }

  async removeSelfAsLeader(req, res) {
    try {
      const { conversationId } = req.body;
      const { userId } = req.params;

      const conversation = await this.getConversationById(
        req,
        res,
        conversationId
      );

      if (!conversation.isGroup) {
        return res.status(400).json({ error: "Chỉ nhóm mới có leader" });
      }

      const isLeader = conversation.members.some(
        (m) => m.id.equals(userId) && m.role === "leader"
      );
      if (!isLeader) {
        return res.status(403).json({ error: "Bạn không phải leader" });
      }

      const totalLeaders = conversation.members.filter(
        (m) => m.role === "leader"
      ).length;
      if (totalLeaders <= 1) {
        return res.status(400).json({ error: "Phải còn ít nhất 1 leader" });
      }

      const updatedConversation = await conversationRepo.updateMemberRole(
        conversationId,
        userId,
        "member"
      );

      return res.status(200).json({
        success: true,
        message: "Bạn đã rời khỏi vị trí leader",
        data: updatedConversation,
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ error: "Lỗi hệ thống" });
    }
  }
}

module.exports = new ConversationService();
