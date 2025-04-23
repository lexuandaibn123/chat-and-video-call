const Message = require("../models/message.model");

class MessageRepository {
  // Tạo mới một message
  async createMessage(data) {
    try {
      const message = new Message(data);
      return await message.save();
    } catch (error) {
      throw new Error("Error creating message: " + error.message);
    }
  }

  // Lấy tất cả message của một cuộc trò chuyện (theo conversationId)
  async getMessagesByConversation(conversationId, limit = 20, skip = 0) {
    try {
      return await Message.find({ conversationId })
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }); // Lấy message mới nhất trước
    } catch (error) {
      throw new Error("Error fetching messages: " + error.message);
    }
  }

  // Cập nhật message (ví dụ: sửa nội dung, đánh dấu đã xem, ...)
  async updateMessage(messageId, updateData) {
    try {
      return await Message.findByIdAndUpdate(messageId, updateData, {
        new: true, // Trả về message đã cập nhật
      });
    } catch (error) {
      throw new Error("Error updating message: " + error.message);
    }
  }

  // Xóa message (soft delete, thay vì xóa thật sự)
  async deleteMessage(messageId) {
    try {
      return await Message.findByIdAndUpdate(
        messageId,
        { isDeleted: true },
        { new: true }
      );
    } catch (error) {
      throw new Error("Error deleting message: " + error.message);
    }
  }

  // Lấy message theo ID
  async getMessageById(messageId) {
    try {
      return await Message.findById(messageId);
    } catch (error) {
      throw new Error("Error fetching message by ID: " + error.message);
    }
  }
}

module.exports = new MessageRepository();
