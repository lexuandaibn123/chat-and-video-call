const ConversationService = require("../services/conversation");
const { SESSION_RELOAD_INTERVAL } = require("../constants");

const initDefaultNameSpace = (defaultNamespace) => {
  defaultNamespace.on("connection", (client) => {
    const sessionTracker = setInterval(() => {
      client.request.session.reload((err) => {
        if (err) {
          client.conn.close();
        }
      });
    }, SESSION_RELOAD_INTERVAL);
    const session = client.request.session;

    if (!session || !session.userInfo) {
      client.emit("unauthorized");
      console.error("Unauthorized client attempted to connect");
      client.disconnect();
      return;
    }

    console.log("Client connected: " + client.id);

    const userInfo = session.userInfo;

    client.on("setup", async ({ page = 1, limit = 30 }) => {
      try {
        client.join(userInfo.id);

        const conversations = await ConversationService.fetchConversationsByWs({
          userId: userInfo.id,
          page,
          limit,
        });
        conversations.forEach((conversation) => {
          const userObj = conversation.members.find((member) => {
            if (member.id == null) return false;
            return (
              (typeof member.id == "object"
                ? member.id._id.toString() == userInfo.id
                : member.id.toString() == userInfo.id) && member.leftAt == null
            );
          });
          if (userObj && userObj.leftAt == null)
            client.join(conversation._id.toString());
        });
        client.emit("connected");
      } catch (error) {
        console.error(error);
        client.emit("error", error);
      }
    });

    client.on("typing", ({ roomId, memberId }) =>
      client.in(roomId).emit("typing", memberId)
    );

    client.on("stopTyping", ({ roomId, memberId }) =>
      client.in(roomId).emit("stopTyping", memberId)
    );

    client.on("createConversation", async ({ members, name }) => {
      if (members.length < 1) {
        client.emit("error", "Members array is empty");
        return;
      }

      try {
        const conversation = await ConversationService.createConversationByWs({
          userId: userInfo.id,
          members,
          name,
        });
        client.join(conversation._id.toString());
        client.emit("createdConversation", conversation);
      } catch (error) {
        console.error(error);
        client.emit("error", error);
      }
    });

    client.on(
      "addNewMember",
      async ({ conversationId, newMemberId, role = "member" }) => {
        if (!conversationId || conversationId.length < 1) {
          client.emit("error", "Invalid conversationId");
          return;
        }

        if (!newMemberId || newMemberId.length < 1) {
          client.emit("error", "Invalid newMemberId");
          return;
        }

        try {
          const conversation = await ConversationService.addNewMemberByWs({
            userId: userInfo.id,
            conversationId,
            newMemberId,
            role,
          });
          client.in(conversationId).emit("addedNewMember", conversation);
        } catch (error) {
          console.error(error);
          client.emit("error", error);
        }
      }
    );

    client.on("removeMember", async ({ conversationId, memberId }) => {
      if (!conversationId || conversationId.length < 1) {
        client.emit("error", "Invalid conversationId");
        return;
      }

      if (!memberId || memberId.length < 1) {
        client.emit("error", "Invalid memberId");
        return;
      }

      try {
        const conversation = await ConversationService.removeMemberByWs({
          userId: userInfo.id,
          conversationId,
          memberId,
        });
        client.in(conversationId).emit("removedMember", conversation);
      } catch (error) {
        console.error(error);
        client.emit("error", error);
      }
    });

    client.on("leaveConversation", async ({ conversationId }) => {
      if (!conversationId || conversationId.length < 1) {
        client.emit("error", "Invalid conversationId");
        return;
      }

      try {
        const conversation = await ConversationService.leaveConversationByWs({
          userId: userInfo.id,
          conversationId,
        });
        client.in(conversationId).emit("leftConversation", conversation);
      } catch (error) {
        console.error(error);
        client.emit("error", error);
      }
    });

    client.on("deleteConversationByLeader", async ({ conversationId }) => {
      if (!conversationId || conversationId.length < 1) {
        client.emit("error", "Invalid conversationId");
        return;
      }

      try {
        const conversation =
          await ConversationService.deleteConversationByLeaderAndWs({
            userId: userInfo.id,
            conversationId,
          });
        client
          .in(conversationId)
          .emit("deletedConversationByLeader", conversation);
      } catch (error) {
        console.error(error);
        client.emit("error", error);
      }
    });

    client.on("updateConversationName", async ({ conversationId, newName }) => {
      if (!conversationId || conversationId.length < 1) {
        client.emit("error", "Invalid conversationId");
        return;
      }

      if (!newName || newName.length < 1) {
        client.emit("error", "Invalid newName");
        return;
      }

      try {
        const conversation =
          await ConversationService.updateConversationNameByWs({
            userId: userInfo.id,
            conversationId,
            newName,
          });
        client.in(conversationId).emit("updatedConversationName", conversation);
      } catch (error) {
        console.error(error);
        client.emit("error", error);
      }
    });

    client.on("updateConversationAvatar", async ({ conversationId, newAvatar }) => {
      if (!conversationId || conversationId.length < 1) {
        client.emit("error", "Invalid conversationId");
        return;
      }

      if (!newAvatar || newAvatar.length < 1) {
        client.emit("error", "Invalid newAvatar");
        return;
      }

      try {
        const conversation =
          await ConversationService.updateConversationAvatarByWs({
            userId: userInfo.id,
            conversationId,
            newAvatar,
          });
        client.in(conversationId).emit("updatedConversationAvatar", conversation);
      } catch (error) {
        console.error(error);
        client.emit("error", error);
      }
    });

    client.on(
      "newMessage",
      async ({ conversationId, data, type, replyToMessageId = null }) => {
        try {
          if (typeof conversationId !== "string" || conversationId.length < 1) {
            console.error("Invalid conversationId type");
            client.in(userInfo.id).emit("error", "Invalid conversationId type");
          }
          if (type !== "text" && type !== "file" && type !== "image") {
            console.error("Invalid type");
            client.in(userInfo.id).emit("error", "Invalid type");
          }

          if (Array.isArray(data)) {
            const isValid = data.every((part) => {
              return (
                typeof part === "object" &&
                part.type == "image" &&
                part.data.length > 0
              );
            });
            if (!isValid || data.length < 1) {
              console.error("Invalid data type");
              client.in(userInfo.id).emit("error", "Invalid data type");
            }
          } else if (typeof data === "object") {
            if (data.type !== "text" && data.type !== "file") {
              console.error("Invalid data type");
              client.in(userInfo.id).emit("error", "Invalid data type");
            }
          } else {
            console.error("Invalid data type");
            client.in(userInfo.id).emit("error", "Invalid data type");
          }

          const message = await ConversationService.createNewMessageByWs({
            userId: userInfo.id,
            conversationId,
            data,
            type,
            replyToMessageId,
          });
          client.in(conversationId).emit("receiveMessage", message);
        } catch (error) {
          console.error(error);
          client.emit("error", error);
        }
      }
    );

    client.on("editMessage", async ({ messageId, newData }) => {
      try {
        if (typeof messageId !== "string" || messageId.length < 1) {
          console.error("Invalid messageId type");
          client.in(userInfo.id).emit("error", "Invalid messageId type");
        }
        if (typeof newData !== "string" || newData.length < 1) {
          console.error("Invalid newData type");
          client.in(userInfo.id).emit("error", "Invalid newData type");
        }

        const updatedMessage = await ConversationService.editMessageByWs({
          userId: userInfo.id,
          messageId,
          newData,
        });
        client
          .in(updatedMessage.conversationId.toString())
          .emit("editedMessage", updatedMessage);
      } catch (error) {
        console.error(error);
        client.emit("error", error);
      }
    });

    client.on("deleteMessage", async ({ messageId }) => {
      try {
        if (typeof messageId !== "string" || messageId.length < 1) {
          console.error("Invalid messageId type");
          client.in(userInfo.id).emit("error", "Invalid messageId type");
        }

        const deletedMessage = await ConversationService.deleteMessageByWs({
          userId: userInfo.id,
          messageId,
        });
        client
          .in(deletedMessage.conversationId.toString())
          .emit("deletedMessage", deletedMessage);
      } catch (error) {
        console.error(error);
        client.emit("error", error);
      }
    });

    client.on("disconnect", () => {
      console.log(`Client disconnected: ${client.id}`);
      clearInterval(sessionTracker);
    });
  });
};

module.exports = initDefaultNameSpace;
