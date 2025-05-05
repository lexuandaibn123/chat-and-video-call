const UserRepository = require("../repositories/user");
const ConversationRepository = require("../repositories/conversation");
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

        const memberIds = [
          ...new Set(
            conversations
              .flatMap((conversation) => conversation.members)
              .filter((member) => member.id !== null)
              .map((member) =>
                typeof member === "object"
                  ? member.id._id.toString()
                  : member.id.toString()
              )
          ),
        ];

        const members = await UserRepository.findByIds(
          memberIds,
          {
            fullName: {
              $regex: name,
              $options: "i",
            },
          },
          "-password -verificationToken -resetToken -resetTokenExpiry"
        );

        return res.status(200).json({
          success: true,
          message: "Users found",
          data: members,
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
