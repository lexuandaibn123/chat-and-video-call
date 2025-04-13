const ChatRoomRepository = require("../repositories/chatRoom");

class ChatRoomService {
  async createRoom(req, res) {
    try {
      const { name, isGroup, members } = req.body;
      const creatorId = req.session.userInfo._id;

      if (isGroup && (!name || members.length < 2)) {
        return res
          .status(400)
          .json({ error: "Group name and at least 2 members required" });
      }

      const allMembers = [...new Set([...members, creatorId])];

      const newRoom = await ChatRoomRepository.create({
        name: isGroup ? name : null,
        isGroup,
        members: allMembers,
        leader: creatorId,
      });

      return res.status(201).json({ success: true, room: newRoom });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  //Tìm tất cả phòng của người dùng đang đăng nhập
  async getUserRooms(req, res) {
    try {
      const userId = req.session.userInfo._id;

      const rooms = await ChatRoomRepository.getRoomByUserId(userId);

      return res.status(200).json({ success: true, rooms });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  async findRoomById(req, res) {
    try {
      const roomId = req.params.id;
      const room = await ChatRoomRepository.findById(roomId);

      if (!room) {
        return res.status(404).json({ error: "Room not found" });
      }

      return res.status(200).json({ success: true, room });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  async findRoomByName(req, res) {
    try {
      const { name } = req.query;
      if (!name) {
        return res.status(400).json({ error: "Name is required" });
      }

      const rooms = await ChatRoomRepository.findRoomsByName(name);
      return res.status(200).json({ success: true, rooms });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  async addUser(req, res) {
    try {
      const { roomId, userIdToAdd } = req.body;
      const requesterId = req.session.userInfo._id;

      const room = await ChatRoomRepository.findById(roomId);

      if (!room) {
        return res.status(404).json({ error: "Room not found" });
      }

      if (room.leader.toString() !== requesterId.toString()) {
        return res.status(403).json({ error: "Only the leader can add users" });
      }

      if (room.members.includes(userIdToAdd)) {
        return res.status(400).json({ error: "User already in room" });
      }

      room.members.push(userIdToAdd);
      await room.save();

      return res.status(200).json({ success: true, message: "User added" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  async removeUser(req, res) {
    try {
      const { roomId, userIdToRemove } = req.body;
      const requesterId = req.session.userInfo._id;

      const room = await ChatRoomRepository.findById(roomId);

      if (!room) {
        return res.status(404).json({ error: "Room not found" });
      }

      if (room.leader.toString() !== requesterId.toString()) {
        return res
          .status(403)
          .json({ error: "Only the leader can remove users" });
      }

      if (!room.members.includes(userIdToRemove)) {
        return res.status(400).json({ error: "User not in room" });
      }

      if (userIdToRemove === room.leader.toString()) {
        return res
          .status(400)
          .json({ error: "Cannot remove leader from room" });
      }

      room.members = room.members.filter(
        (id) => id.toString() !== userIdToRemove
      );
      await room.save();

      return res.status(200).json({ success: true, message: "User removed" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  async changeLeader(req, res) {
    try {
      const { roomId, newLeaderId } = req.body;
      const requesterId = req.session.userInfo._id;

      const room = await ChatRoomRepository.findById(roomId);

      if (!room) {
        return res.status(404).json({ error: "Room not found" });
      }

      if (room.leader.toString() !== requesterId.toString()) {
        return res
          .status(403)
          .json({ error: "Only the current leader can change the leader" });
      }

      if (!room.members.includes(newLeaderId)) {
        return res
          .status(400)
          .json({ error: "New leader must be a member of the room" });
      }

      room.leader = newLeaderId;
      await room.save();

      return res.status(200).json({ success: true, message: "Leader changed" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
}

module.exports = new ChatRoomService();
