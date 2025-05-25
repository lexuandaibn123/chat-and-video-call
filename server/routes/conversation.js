const express = require("express");
const router = express.Router();
const ConversationService = require("../services/conversation");
const { authMiddleware } = require("../middleware/auth");
const { validateMiddleware } = require("../middleware/validate");
const { check } = require("express-validator");

router.use(authMiddleware);

/**
 * @openapi
 * /api/conversation/create-conversation:
 *   post:
 *     tags:
 *       - Conversation
 *     summary: Create a new conversation
 *     description: Creates a new conversation with the specified members. The authenticated user is automatically included if not specified in the members list. For two members, it checks if a conversation already exists.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               members:
 *                 type: array
 *                 items:
 *                   type: string
 *                 minItems: 1
 *                 description: Array of user IDs to include in the conversation
 *               name:
 *                 type: string
 *                 description: Optional name for the conversation
 *     responses:
 *       200:
 *         description: Conversation created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/ConversationWithoutPopulate'
 *       400:
 *         description: Validation error, insufficient members, or conversation already exists
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.post(
  "/create-conversation",
  [
    check("members")
      .isArray({ min: 1 })
      .withMessage("Members must be at least 1 member"),
  ],
  validateMiddleware,
  ConversationService.createConversation.bind(ConversationService)
);

/**
 * @openapi
 * /api/conversation/get-conversation:
 *   get:
 *     tags:
 *       - Conversation
 *     summary: Fetch a specific conversation by ID
 *     description: Retrieves details of a specific conversation by its ID for the authenticated user. The user must be a member of the conversation.
 *     parameters:
 *       - in: query
 *         name: conversationId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the conversation to fetch
 *     responses:
 *       200:
 *         description: Conversation fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   description: Indicates if the request was successful
 *                 data:
 *                   $ref: '#/components/schemas/Conversation'
 *       400:
 *         description: Bad request, such as invalid conversation ID or user not a member of the conversation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message describing the issue
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message for internal server error
 */
router.get(
  "/get-conversation",
  [
    check("conversationId")
      .exists()
      .withMessage("conversationId is required")
      .isString()
      .withMessage("conversationId must be a string"),
  ],
  ConversationService.fetchConversationById.bind(ConversationService)
);

/**
 * @openapi
 * /api/conversation/get-conversations:
 *   get:
 *     tags:
 *       - Conversation
 *     summary: Fetch user's conversations
 *     description: Retrieves a paginated list of conversations that the authenticated user is a part of.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of conversations per page
 *     responses:
 *       200:
 *         description: Conversations fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     $ref: '#/components/schemas/Conversation'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.get(
  "/get-conversations",
  ConversationService.fetchConversations.bind(ConversationService)
);

/**
 * @openapi
 * /api/conversation/search-by-name:
 *   get:
 *     tags:
 *       - Conversation
 *     summary: Search conversations by name
 *     description: Searches for conversations the authenticated user is part of by name, with pagination.
 *     parameters:
 *       - in: query
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Name to search for in conversations
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of conversations per page
 *     responses:
 *       200:
 *         description: Search results fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     description: Conversation object
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.get(
  "/search-by-name",
  ConversationService.searchByName.bind(ConversationService)
);

/**
 * @openapi
 * /api/conversation/add-new-member:
 *   post:
 *     tags:
 *       - Conversation
 *     summary: Add a new member to a conversation
 *     description: Adds a new member to an existing group conversation. The authenticated user must be a member of the conversation.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               conversationId:
 *                 type: string
 *                 description: ID of the conversation
 *               newMemberId:
 *                 type: string
 *                 description: ID of the user to add
 *               role:
 *                 type: string
 *                 enum: ["member", "leader"]
 *                 default: "member"
 *                 description: Role of the new member
 *     responses:
 *       200:
 *         description: Member added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   description: Updated conversation object
 *       400:
 *         description: Validation error, user already a member, or conversation not a group
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.post(
  "/add-new-member",
  [
    check("conversationId")
      .isLength({ min: 1 })
      .withMessage("conversationId must be string"),
    check("newMemberId")
      .isLength({ min: 1 })
      .withMessage("newMemberId must be string"),
  ],
  validateMiddleware,
  ConversationService.addNewMember.bind(ConversationService)
);

/**
 * @openapi
 * /api/conversation/remove-member:
 *   post:
 *     tags:
 *       - Conversation
 *     summary: Remove a member from a conversation
 *     description: Removes a member from a group conversation. The authenticated user must be a leader of the conversation.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               conversationId:
 *                 type: string
 *                 description: ID of the conversation
 *               memberId:
 *                 type: string
 *                 description: ID of the member to remove
 *     responses:
 *       200:
 *         description: Member removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   description: Updated conversation object
 *       400:
 *         description: Validation error, user not a member, not a leader, or conversation not a group
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.post(
  "/remove-member",
  [
    check("conversationId")
      .isLength({ min: 1 })
      .withMessage("conversationId must be string"),
    check("memberId")
      .isLength({ min: 1 })
      .withMessage("memberId must be string"),
  ],
  validateMiddleware,
  ConversationService.removeMember.bind(ConversationService)
);

/**
 * @openapi
 * /api/conversation/leave-conversation:
 *   post:
 *     tags:
 *       - Conversation
 *     summary: Leave a conversation
 *     description: Allows the authenticated user to leave a group conversation. If the user is the last leader, the first remaining member is promoted to leader.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               conversationId:
 *                 type: string
 *                 description: ID of the conversation
 *     responses:
 *       200:
 *         description: Left conversation successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Validation error, not a member, conversation not a group, or last member cannot leave
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.post(
  "/leave-conversation",
  [
    check("conversationId")
      .isLength({ min: 1 })
      .withMessage("conversationId must be string"),
  ],
  validateMiddleware,
  ConversationService.leaveConversation.bind(ConversationService)
);

/**
 * @openapi
 * /api/conversation/delete-conversation-by-member:
 *   post:
 *     tags:
 *       - Conversation
 *     summary: Delete a conversation by a member
 *     description: Allows the authenticated user to delete a conversation from their view. The conversation remains for other members.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               conversationId:
 *                 type: string
 *                 description: ID of the conversation
 *     responses:
 *       200:
 *         description: Conversation deleted successfully for the member
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Validation error or not a member
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.post(
  "/delete-conversation-by-member",
  [
    check("conversationId")
      .isLength({ min: 1 })
      .withMessage("conversationId must be string"),
  ],
  validateMiddleware,
  ConversationService.deleteConversationByMember.bind(ConversationService)
);

/**
 * @openapi
 * /api/conversation/delete-conversation-by-leader:
 *   post:
 *     tags:
 *       - Conversation
 *     summary: Delete a conversation by a leader
 *     description: Allows a leader to delete a group conversation entirely for all members.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               conversationId:
 *                 type: string
 *                 description: ID of the conversation
 *     responses:
 *       200:
 *         description: Conversation deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Validation error, not a leader, or conversation not a group
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.post(
  "/delete-conversation-by-leader",
  [
    check("conversationId")
      .isLength({ min: 1 })
      .withMessage("conversationId must be string"),
  ],
  validateMiddleware,
  ConversationService.deleteConversationByLeader.bind(ConversationService)
);

/**
 * @openapi
 * /api/conversation/update-member-role:
 *   put:
 *     tags:
 *       - Conversation
 *     summary: Update a member's role in a conversation
 *     description: Allows a leader to update the role of a member in a group conversation. Cannot change the role of a leader.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               conversationId:
 *                 type: string
 *                 description: ID of the conversation
 *               memberId:
 *                 type: string
 *                 description: ID of the member whose role is to be updated
 *               newRole:
 *                 type: string
 *                 enum: ["member", "leader"]
 *                 description: New role for the member
 *     responses:
 *       200:
 *         description: Member role updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Validation error, not a leader, conversation not a group, or cannot change leader's role
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.put(
  "/update-member-role",
  [
    check("conversationId")
      .isLength({ min: 1 })
      .withMessage("conversationId must be string"),
    check("memberId")
      .isLength({ min: 1 })
      .withMessage("memberId must be string"),
    check("newRole")
      .custom((value) => ["member", "leader"].includes(value))
      .withMessage("Role is not valid"),
  ],
  validateMiddleware,
  ConversationService.updateMemberRole.bind(ConversationService)
);

/**
 * @openapi
 * /api/conversation/update-conversation-name:
 *   put:
 *     tags:
 *       - Conversation
 *     summary: Update the name of a conversation
 *     description: Allows a member to update the name of a group conversation.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               conversationId:
 *                 type: string
 *                 description: ID of the conversation
 *               newName:
 *                 type: string
 *                 description: New name for the conversation
 *     responses:
 *       200:
 *         description: Conversation name updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Validation error, not a member, or conversation not a group
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.put(
  "/update-conversation-name",
  [
    check("conversationId")
      .isLength({ min: 1 })
      .withMessage("conversationId must be string"),
    check("newName").isLength({ min: 1 }).withMessage("newName must be string"),
  ],
  validateMiddleware,
  ConversationService.updateConversationName.bind(ConversationService)
);

/**
 * @openapi
 * /api/conversation/update-conversation-avatar:
 *   put:
 *     tags:
 *       - Conversation
 *     summary: Update the avatar of a conversation
 *     description: Allows a member to update the avatar of a group conversation.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               conversationId:
 *                 type: string
 *                 description: ID of the conversation
 *               newAvatar:
 *                 type: string
 *                 description: New avatar for the conversation
 *     responses:
 *       200:
 *         description: Conversation avatar updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Validation error, not a member, or conversation not a group
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.put(
  "/update-conversation-avatar",
  [
    check("conversationId")
      .isLength({ min: 1 })
      .withMessage("conversationId must be string"),
    check("newAvatar").isURL().withMessage("newAvatar must be a valid URL"),
  ],
  validateMiddleware,
  ConversationService.updateConversationAvatar.bind(ConversationService)
);

/**
 * @openapi
 * /api/conversation/get-messages:
 *   get:
 *     tags:
 *       - Conversation
 *     summary: Fetch messages from a conversation
 *     description: Retrieves a list of messages from the specified conversation for the authenticated user, with pagination support.
 *     parameters:
 *       - in: query
 *         name: conversationId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the conversation
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Number of messages to retrieve
 *       - in: query
 *         name: skip
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of messages to skip for pagination
 *     responses:
 *       200:
 *         description: Messages fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Message'
 *       400:
 *         description: Validation error or user is not a member of the conversation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */

router.get(
  "/get-messages",
  [
    check("conversationId")
      .exists()
      .withMessage("conversationId is required")
      .isString()
      .withMessage("conversationId must be a string"),
  ],
  validateMiddleware,
  ConversationService.fetchMessages.bind(ConversationService)
);
/**
 * @openapi
 * /api/conversation/create-new-message:
 *   post:
 *     tags:
 *       - Conversation
 *     summary: Create a new message in a conversation
 *     description: Creates a new message in the specified conversation. The message type can be "text", "image", or "file", and the data must correspond to the type.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               conversationId:
 *                 type: string
 *                 description: ID of the conversation
 *               type:
 *                 type: string
 *                 enum: ["text", "image", "file"]
 *                 description: Type of the message
 *               data:
 *                 oneOf:
 *                   - $ref: '#/components/schemas/TextPart'
 *                   - type: array
 *                     items:
 *                       $ref: '#/components/schemas/ImagePart'
 *                   - $ref: '#/components/schemas/FilePart'
 *                 description: Content of the message. If type is "text", data should be TextPart. If type is "image", data should be an array of ImagePart. If type is "file", data should be FilePart.
 *               replyToMessageId:
 *                 type: string
 *                 nullable: true
 *                 example: null
 *                 description: ID of the message this message is replying to, if any
 *             required:
 *               - conversationId
 *               - type
 *               - data
 *     responses:
 *       200:
 *         description: Message created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Message'
 *       400:
 *         description: Validation error or user is not a member of the conversation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.post(
  "/create-new-message",
  [
    check("conversationId")
      .isLength({ min: 1 })
      .withMessage("conversationId must be string"),
    check("type")
      .isIn(["text", "image", "file"])
      .withMessage("type is invalid"),
    check("data")
      .custom((value) => {
        if (Array.isArray(value))
          return (
            value.length > 0 &&
            value.every((item) => {
              return (
                typeof item === "object" &&
                item.type == "image" &&
                item.data.length > 0
              );
            })
          );
        else if (typeof value === "object") {
          return value.type == "text" || value.type == "file";
        }
        return false;
      })
      .withMessage("data is invalid"),
  ],
  validateMiddleware,
  ConversationService.createNewMessage.bind(ConversationService)
);

/**
 * @openapi
 * /api/conversation/edit-message:
 *   put:
 *     tags:
 *       - Conversation
 *     summary: Edit a message
 *     description: Edits the content of a text message. Only the owner of the message can edit it, and only text messages can be edited.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               messageId:
 *                 type: string
 *                 description: ID of the message to edit
 *               newData:
 *                 type: string
 *                 description: New text content for the message
 *             required:
 *               - messageId
 *               - newData
 *     responses:
 *       200:
 *         description: Message edited successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Message'
 *       400:
 *         description: Validation error, not the owner, or not a text message
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.put(
  "/edit-message",
  [
    check("messageId")
      .isLength({ min: 1 })
      .withMessage("messageId must be string"),
    check("newData")
      .custom((value) => typeof value === "string" && value.length > 0)
      .withMessage("newData must be string"),
  ],
  validateMiddleware,
  ConversationService.editMessage.bind(ConversationService)
);

/**
 * @openapi
 * /api/conversation/delete-message:
 *   post:
 *     tags:
 *       - Conversation
 *     summary: Delete a message
 *     description: Deletes a message from the conversation. Only the owner of the message can delete it.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               messageId:
 *                 type: string
 *                 description: ID of the message to delete
 *             required:
 *               - messageId
 *     responses:
 *       200:
 *         description: Message deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Message'
 *       400:
 *         description: Validation error or not the owner of the message
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.post(
  "/delete-message",
  [
    check("messageId")
      .isLength({ min: 1 })
      .withMessage("messageId must be string"),
  ],
  validateMiddleware,
  ConversationService.deleteMessage.bind(ConversationService)
);

module.exports = router;
