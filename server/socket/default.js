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

    client.on("joinRoom", async ({ roomId }) => {
      try {
        if (!roomId || roomId.length < 1) throw new Error("Invalid roomId");
        const conversation =
          await ConversationService.verifyConversationAndUserByWs({
            roomId,
            userId: userInfo.id,
          });

        if (!conversation) throw new Error("Conversation not found");

        client.join(roomId);
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
      try {
        if (members.length < 1) throw new Error("Members array is empty");

        const conversation = await ConversationService.createConversationByWs({
          userId: userInfo.id,
          members,
          name,
        });
        client.join(conversation._id.toString());

        conversation.members.forEach((member) => {
          const memberId = member.id.toString();
          defaultNamespace.in(memberId).emit("newConversation", conversation);
        });
      } catch (error) {
        console.error(error);
        client.emit("error", error);
      }
    });

    client.on(
      "addNewMember",
      async ({ conversationId, newMemberId, role = "member" }) => {
        try {
          if (!conversationId || conversationId.length < 1)
            throw new Error("Invalid conversationId");

          if (!newMemberId || newMemberId.length < 1)
            throw new Error("Invalid newMemberId");

          const conversation = await ConversationService.addNewMemberByWs({
            userId: userInfo.id,
            conversationId,
            newMemberId,
            role,
          });
          defaultNamespace
            .in(newMemberId)
            .emit("newConversation", conversation);
          defaultNamespace
            .in(conversationId)
            .emit("addedNewMember", conversation);
        } catch (error) {
          console.error(error);
          client.emit("error", error);
        }
      }
    );

    client.on("removeMember", async ({ conversationId, memberId }) => {
      try {
        if (!conversationId || conversationId.length < 1)
          throw new Error("Invalid conversationId");

        if (!memberId || memberId.length < 1)
          throw new Error("Invalid memberId");

        const conversation = await ConversationService.removeMemberByWs({
          userId: userInfo.id,
          conversationId,
          memberId,
        });
        defaultNamespace.in(conversationId).emit("removedMember", conversation);
      } catch (error) {
        console.error(error);
        client.emit("error", error);
      }
    });

    client.on("leaveConversation", async ({ conversationId }) => {
      try {
        if (!conversationId || conversationId.length < 1)
          throw new Error("Invalid conversationId");

        await ConversationService.leaveConversationByWs({
          userId: userInfo.id,
          conversationId,
        });
        client
          .in(conversationId)
          .emit("leftConversation", { conversationId, userId: userInfo.id });
      } catch (error) {
        console.error(error);
        client.emit("error", error);
      }
    });

    client.on("deleteConversationByLeader", async ({ conversationId }) => {
      try {
        if (!conversationId || conversationId.length < 1)
          throw new Error("Invalid conversationId");

        const conversation =
          await ConversationService.deleteConversationByLeaderAndWs({
            userId: userInfo.id,
            conversationId,
          });
        defaultNamespace
          .in(conversationId)
          .emit("deletedConversationByLeader", conversation);
      } catch (error) {
        console.error(error);
        client.emit("error", error);
      }
    });

    client.on("updateConversationName", async ({ conversationId, newName }) => {
      try {
        if (!conversationId || conversationId.length < 1)
          throw new Error("Invalid conversationId");

        if (!newName || newName.length < 1) throw new Error("Invalid newName");

        const conversation =
          await ConversationService.updateConversationNameByWs({
            userId: userInfo.id,
            conversationId,
            newName,
          });
        defaultNamespace
          .in(conversationId)
          .emit("updatedConversationName", conversation);
      } catch (error) {
        console.error(error);
        client.emit("error", error);
      }
    });

    client.on(
      "updateConversationAvatar",
      async ({ conversationId, newAvatar }) => {
        try {
          if (!conversationId || conversationId.length < 1)
            throw new Error("Invalid conversationId");

          if (!newAvatar || newAvatar.length < 1)
            throw new Error("Invalid newAvatar");

          const conversation =
            await ConversationService.updateConversationAvatarByWs({
              userId: userInfo.id,
              conversationId,
              newAvatar,
            });
          defaultNamespace
            .in(conversationId)
            .emit("updatedConversationAvatar", conversation);
        } catch (error) {
          console.error(error);
          client.emit("error", error);
        }
      }
    );

    client.on(
      "updateMemberRole",
      async ({ conversationId, memberId, newRole }) => {
        try {
          if (!conversationId || conversationId.length < 1)
            throw new Error("Invalid conversationId");

          if (!memberId || memberId.length < 1)
            throw new Error("Invalid memberId");

          if (newRole !== "leader" && newRole !== "member")
            throw new Error("Invalid newRole");

          const conversation = await ConversationService.updateMemberRoleByWs({
            userId: userInfo.id,
            conversationId,
            memberId,
            newRole,
          });
          if (!conversation) {
            client.emit("error", "Conversation not found");
            return;
          }
          defaultNamespace.in(conversationId).emit("updatedMemberRole", {
            userId: memberId,
            conversationId,
            newRole,
          });
        } catch (error) {
          console.error(error);
          client.emit("error", error);
        }
      }
    );

    client.on(
      "newMessage",
      async ({ conversationId, data, type, replyToMessageId = null }) => {
        try {
          if (typeof conversationId !== "string" || conversationId.length < 1)
            throw new Error("Invalid conversationId type");
          if (type !== "text" && type !== "file" && type !== "image")
            throw new Error("Invalid type");

          if (Array.isArray(data)) {
            const isValid = data.every((part) => {
              return (
                typeof part === "object" &&
                part.type == "image" &&
                part.data.length > 0
              );
            });
            if (!isValid || data.length < 1)
              throw new Error("Invalid data type");
          } else if (typeof data === "object") {
            if (data.type !== "text" && data.type !== "file")
              throw new Error("Invalid data type");
          } else throw new Error("Invalid data type");

          const message = await ConversationService.createNewMessageByWs({
            userId: userInfo.id,
            conversationId,
            data,
            type,
            replyToMessageId,
          });
          defaultNamespace.in(conversationId).emit("receiveMessage", message);
        } catch (error) {
          console.error(error);
          client.emit("error", error);
        }
      }
    );

    client.on("editMessage", async ({ messageId, newData }) => {
      try {
        if (typeof messageId !== "string" || messageId.length < 1)
          throw new Error("Invalid messageId type");

        if (typeof newData !== "string" || newData.length < 1)
          throw new Error("Invalid newData type");

        const updatedMessage = await ConversationService.editMessageByWs({
          userId: userInfo.id,
          messageId,
          newData,
        });
        defaultNamespace
          .in(updatedMessage.conversationId.toString())
          .emit("editedMessage", updatedMessage);
      } catch (error) {
        console.error(error);
        client.emit("error", error);
      }
    });

    client.on("deleteMessage", async ({ messageId }) => {
      try {
        if (typeof messageId !== "string" || messageId.length < 1)
          throw new Error("Invalid messageId type");

        const deletedMessage = await ConversationService.deleteMessageByWs({
          userId: userInfo.id,
          messageId,
        });
        defaultNamespace
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
