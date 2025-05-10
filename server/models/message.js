const mongoose = require("mongoose");
const { ImagePartSchema, FilePartSchema, TextPartSchema } = require("./part");

/**
 * @openapi
 * components:
 *   schemas:
 *     MessageWithoutPopulate:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Unique identifier of the message
 *           example: 60d5f483f1b0b30015b6a3b2
 *         conversationId:
 *           type: string
 *           description: ID of the conversation this message belongs to
 *           example: 60d5f483f1b0b30015b6a3b1
 *         senderId:
 *           type: string
 *           description: ID of the user who sent the message
 *           example: 60d5f483f1b0b30015b6a3b0
 *         type:
 *           type: string
 *           enum: ["text", "file", "image"]
 *           description: Type of the message
 *           example: text
 *         content:
 *           type: object
 *           properties:
 *             text:
 *               oneOf:
 *                 - $ref: '#/components/schemas/TextPart'
 *                 - type: 'null'
 *               description: Text content, present if type is "text"
 *             image:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ImagePart'
 *               description: Array of images, present if type is "image"
 *             file:
 *               oneOf:
 *                 - $ref: '#/components/schemas/FilePart'
 *                 - type: 'null'
 *               description: File content, present if type is "file"
 *           description: Content of the message. Typically, only one of text, image, or file is populated based on the type.
 *         isDeleted:
 *           type: boolean
 *           description: Whether the message has been deleted
 *           example: false
 *         isEdited:
 *           type: boolean
 *           description: Whether the message has been edited
 *           example: false
 *         replyToMessageId:
 *           type: string
 *           nullable: true
 *           description: ID of the message this message is replying to, if any
 *           example: null
 *         datetime_created:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the message was created
 *           example: 2023-10-01T12:00:00Z
 *         last_updated:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the message was last updated
 *           example: 2023-10-01T12:00:00Z
 *       required:
 *         - _id
 *         - conversationId
 *         - senderId
 *         - type
 *         - content
 *         - isDeleted
 *         - isEdited
 *         - datetime_created
 *         - last_updated
 *
 *     Message:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Unique identifier of the message
 *           example: 60d5f483f1b0b30015b6a3b2
 *         conversationId:
 *           type: string
 *           description: ID of the conversation this message belongs to
 *           example: 60d5f483f1b0b30015b6a3b1
 *         senderId:
 *           $ref: '#/components/schemas/User'
 *         type:
 *           type: string
 *           enum: ["text", "file", "image"]
 *           description: Type of the message
 *           example: text
 *         content:
 *           type: object
 *           properties:
 *             text:
 *               oneOf:
 *                 - $ref: '#/components/schemas/TextPart'
 *                 - type: 'null'
 *               description: Text content, present if type is "text"
 *             image:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ImagePart'
 *               description: Array of images, present if type is "image"
 *             file:
 *               oneOf:
 *                 - $ref: '#/components/schemas/FilePart'
 *                 - type: 'null'
 *               description: File content, present if type is "file"
 *           description: Content of the message. Typically, only one of text, image, or file is populated based on the type.
 *         isDeleted:
 *           type: boolean
 *           description: Whether the message has been deleted
 *           example: false
 *         isEdited:
 *           type: boolean
 *           description: Whether the message has been edited
 *           example: false
 *         replyToMessageId:
 *           type: string
 *           nullable: true
 *           description: ID of the message this message is replying to, if any
 *           example: null
 *         datetime_created:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the message was created
 *           example: 2023-10-01T12:00:00Z
 *         last_updated:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the message was last updated
 *           example: 2023-10-01T12:00:00Z
 *       required:
 *         - _id
 *         - conversationId
 *         - senderId
 *         - type
 *         - content
 *         - isDeleted
 *         - isEdited
 *         - datetime_created
 *         - last_updated
 */
const MessageSchema = new mongoose.Schema(
  {
    conversationId: { type: mongoose.Types.ObjectId, ref: "Conversation" },
    senderId: { type: mongoose.Types.ObjectId, ref: "User" },

    type: {
      type: String,
      enum: ["text", "file", "image"],
      default: "text",
      index: true,
    },

    content: {
      text: TextPartSchema,
      image: {
        type: [ImagePartSchema],
        default: [],
      },
      file: FilePartSchema,
    },
    isDeleted: { type: Boolean, default: false },
    isEdited: { type: Boolean, default: false },
    replyToMessageId: { type: mongoose.Types.ObjectId, ref: "Message", default: null },
  },
  {
    timestamps: { createdAt: "datetime_created", updatedAt: "last_updated" },
  }
);

MessageSchema.index({ "content.text.data": "text" });

module.exports = mongoose.model("Message", MessageSchema);
