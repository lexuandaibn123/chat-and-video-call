const ChatRoom = require("../models/chatRoom");

class ChatRoomRepository {
  async createChatRoom(data) {
    return await ChatRoom.create(data);
  }

  async getChatRoomById(id) {
    return await ChatRoom.findById(id);
  }

  async getChatRoomsByUser(userId) {
    return await ChatRoom.find({ members: userId });
  }

  async findByName(name) {
    return await ChatRoom.find({ name: { $regex: name, $options: "i" } });
  }

  async addUserToChatRoom(chatRoomId, userId) {
    const chatRoom = await ChatRoom.findById(chatRoomId);
    if (chatRoom) {
      if (!chatRoom.members.includes(userId)) {
        chatRoom.members.push(userId);
        await chatRoom.save();
      }
      return chatRoom;
    }
    throw new Error("Chat room not found");
  }

  async removeUserFromChatRoom(chatRoomId, userId) {
    const chatRoom = await ChatRoom.findById(chatRoomId);
    if (chatRoom) {
      chatRoom.members = chatRoom.members.filter(
        (member) => member.toString() !== userId
      );
      await chatRoom.save();
      return chatRoom;
    }
    throw new Error("Chat room not found");
  }

  async isUserInChatRoom(chatRoomId, userId) {
    const chatRoom = await ChatRoom.findById(chatRoomId);
    if (chatRoom) {
      return chatRoom.members.includes(userId);
    }
    return false;
  }

  async getChatRoomsByUserId(userId) {
    return await ChatRoom.find({ members: userId });
  }
}

module.exports = new ChatRoomRepository();
