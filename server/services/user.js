const UserRepository = require("../repositories/user");
const ConversationRepository = require("../repositories/conversation");
const mongoose = require("mongoose");
class UserService {
  async findUserById(req, res) {
    try {
      const id = req.params.id;

      const user = await UserRepository.findById(id);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      return res.status(200).json({
        success: true,
        message: "User found",
        data: user,
      });
    } catch (error) {
      console.error("Error finding user by ID:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  async findUserByEmail(req, res) {
    try {
      const email = req.params.email;
      const user = await UserRepository.findByEmail(email);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      return res.status(200).json({
        success: true,
        message: "User found",
        data: user,
      });
    } catch (error) {
      console.error("Error finding user by email:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  async findUsersByName(req, res) {
    try {
      const { name } = req.query;
      const userInfo = req.session.userInfo;
      try {
        const conversations = [
          ...(await ConversationRepository.findByUserId(userInfo.id, 1, 0, {
            isGroup: false,
          })),
          ...(await ConversationRepository.findByUserId(userInfo.id, 1, 0, {
            isGroup: true,
          })),
        ];

        const members = new Map();
        conversations
          .flatMap((conversation) => conversation.members)
          .filter(
            (member) =>
              member.id !== null &&
              member.id._id.toString() !== userInfo.id &&
              member.id.fullName.toLowerCase().includes(name.toLowerCase())
          )
          .map((member) => {
            if (!member.id) return null;
            return member.id;
          })
          .forEach((member) => {
            if (!members.has(member._id.toString())) {
              members.set(member._id.toString(), member);
            }
          });

        return res.status(200).json({
          success: true,
          message: "Users found",
          data: Array.from(members.values()),
        });
      } catch (error) {
        console.error(error);
        return res.status(400).json({ error: error.message });
      }
    } catch (error) {
      console.error("Error finding users by name:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  async getFriends(req, res) {
    try {
      const { name = "" } = req.query;
      const userId = req.session.userInfo.id;
      try {
        const conversations = await ConversationRepository.findByUserId(
          userId,
          1,
          0,
          {
            isGroup: false,
          }
        );

        const friends = new Map();

        conversations
          .flatMap((conversation) => conversation.members)
          .filter(
            (member) =>
              member.id !== null &&
              member.id._id.toString() !== userId &&
              member.id.fullName.toLowerCase().includes(name.toLowerCase())
          )
          .map((member) => {
            if (!member.id) return null;
            return member.id;
          })
          .forEach((member) => {
            if (!friends.has(member._id.toString())) {
              friends.set(member._id.toString(), member);
            }
          });

        return res.status(200).json({
          success: true,
          message: "Users found",
          data: Array.from(friends.values()),
        });
      } catch (error) {
        console.error(error);
        return res.status(400).json({ error: error.message });
      }
    } catch (error) {
      console.error("Error getting friends:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  async getPotentialFriends(req, res) {
    try {
      const { name = "" } = req.query;

      const userId = req.session.userInfo.id;

      try {
        const conversations = await ConversationRepository.findByUserId(
          userId,
          1,
          0,
          {
            isGroup: false,
          }
        );

        const friends = new Map();
        conversations
          .flatMap((conversation) => conversation.members)
          .filter(
            (member) =>
              member.id !== null && member.id._id.toString() !== userId
          )
          .map((member) => {
            if (!member.id) return null;
            return member.id;
          })
          .forEach((member) => {
            if (!friends.has(member._id.toString())) {
              friends.set(member._id.toString(), member);
            }
          });

        const groups = await ConversationRepository.findByUserId(userId, 1, 0, {
          isGroup: true,
          members: {
            $elemMatch: {
              id: userId,
              leftAt: null,
            },
          },
        });

        const potentialFriends = new Map();

        groups.forEach((conversation) => {
          conversation.members
            .filter(
              (member) =>
                member.id !== null &&
                member.id._id.toString() !== userId &&
                member.id.fullName.toLowerCase().includes(name.toLowerCase()) &&
                member.id._id.toString() !== userId &&
                !friends.has(member.id._id.toString())
            )
            .map((member) => {
              if (!member.id) return null;
              return member.id;
            })
            .forEach((member) => {
              if (!member) return null;

              if (!potentialFriends.has(member._id.toString())) {
                potentialFriends.set(member._id.toString(), {
                  info: member,
                  sharedGroups: [conversation],
                  mutualFriends: [],
                });
              } else {
                const existingMember = potentialFriends.get(
                  member._id.toString()
                );
                existingMember.sharedGroups.push(conversation);
              }
            });
        });

        const data = await Promise.all(
          Array.from(friends.values()).map(async (info) => {
            const conversations = await ConversationRepository.findByUserId(
              info._id.toString(),
              1,
              0,
              {
                isGroup: false,
              }
            );

            const friends = new Map();
            conversations
              .flatMap((conversation) => conversation.members)
              .filter(
                (member) =>
                  member.id !== null &&
                  member.id._id.toString() !== userId &&
                  member.id._id.toString() !== info._id.toString() &&
                  member.id.fullName.toLowerCase().includes(name.toLowerCase())
              )
              .map((member) => {
                if (!member.id) return null;
                return member.id;
              })
              .forEach((member) => {
                if (!friends.has(member._id.toString())) {
                  friends.set(member._id.toString(), {
                    info: member,
                    mutualFriend: info,
                  });
                }
              });

            return Array.from(friends.values());
          })
        );

        data
          .flat()
          .filter(
            (friend) =>
              friend.info &&
              !friends.has(friend.info._id.toString()) &&
              friend.info._id.toString() !== userId
          )
          .forEach((friend) => {
            if (!potentialFriends.has(friend.info._id.toString())) {
              potentialFriends.set(friend.info._id.toString(), {
                info: friend.info,
                sharedGroups: [],
                mutualFriends: [friend.mutualFriend],
              });
            } else {
              const existingMember = potentialFriends.get(
                friend.info._id.toString()
              );
              existingMember.mutualFriends.push(friend.mutualFriend);
            }
          });

        return res.status(200).json({
          success: true,
          message: "Potential friends found",
          data: Array.from(potentialFriends.values()),
        });
      } catch (error) {
        console.error(error);
        return res.status(400).json({ error: error.message });
      }
    } catch (error) {
      console.error("Error getting potential friends:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  async getRandomUsers(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;

      const userId = req.session.userInfo.id;
      try {
        const conversations = [
          ...(await ConversationRepository.findByUserId(userId, 1, 0, {
            isGroup: false,
          })),
        ];

        const friendIds = [
          ...new Set(
            conversations
              .flatMap((conversation) => conversation.members)
              .filter((member) => member.id !== null)
              .map((member) =>
                typeof member.id === "object"
                  ? member.id._id.toString()
                  : member.id.toString()
              )
          ),
        ];

        const excludeIds = [
          new mongoose.Types.ObjectId(userId),
          ...friendIds.map((id) => new mongoose.Types.ObjectId(id)),
        ];

        const users = await UserRepository.getRandomUsers(
          excludeIds,
          page,
          limit
        );

        return res.status(200).json({
          success: true,
          message: "Random users found",
          data: users,
        });
      } catch (error) {
        console.error(error);
        return res.status(400).json({ error: error.message });
      }
    } catch (error) {
      console.error("Error getting random users:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  async updateUserName(req, res) {
    try {
      const { fullName } = req.body;

      const userId = req.session.userInfo.id;

      const updatedUser = await UserRepository.updateById(userId, { fullName });
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }
      return res.status(200).json({
        success: true,
        message: "User name updated successfully",
        data: updatedUser,
      });
    } catch (error) {
      console.error("Error updating user name:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  async updateUserAvatar(req, res) {
    try {
      const { avatar } = req.body;

      const userId = req.session.userInfo.id;

      const updatedUser = await UserRepository.updateById(userId, { avatar });
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }
      return res.status(200).json({
        success: true,
        message: "User avatar updated successfully",
        data: updatedUser,
      });
    } catch (error) {
      console.error("Error updating user avatar:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
}

module.exports = new UserService();
