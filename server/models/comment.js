const mongoose = require("mongoose");
const { ImagePartSchema, FilePartSchema, TextPartSchema } = require("./part");
/**
 * @openapi
 * components:
 *   schemas:
 *     CommentWithoutPopulate:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Unique identifier of the comment
 *           example: 507f1f77bcf86cd799439011
 *         postId:
 *           type: string
 *           description: ID of the post this comment belongs to
 *           example: 507f1f77bcf86cd799439012
 *         replyToCommentId:
 *           type: string
 *           description: ID of the comment this is a reply to, or null if it's a top-level comment
 *           example: 507f1f77bcf86cd799439013
 *         userId:
 *           type: string
 *           description: ID of the user who made the comment
 *           example: 507f1f77bcf86cd799439014
 *         type:
 *           type: string
 *           enum: ["text"]
 *           description: Type of the comment content
 *           example: text
 *         content:
 *           type: object
 *           properties:
 *             text:
 *               $ref: '#/components/schemas/TextPart'
 *           description: The content of the comment. Depending on the 'type', the corresponding property is used - 'text' for text
 *         isDeleted:
 *           type: boolean
 *           description: Whether the comment has been deleted
 *           example: false
 *         isEdited:
 *           type: boolean
 *           description: Whether the comment has been edited
 *           example: false
 *         datetime_created:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the comment was created
 *           example: 2023-01-01T00:00:00Z
 *         last_updated:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the comment was last updated
 *           example: 2023-01-01T00:00:00Z
 *       required:
 *         - postId
 *         - userId
 *         - type
 *         - content
 *
 *     Comment:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Unique identifier of the comment
 *           example: 507f1f77bcf86cd799439011
 *         postId:
 *           type: string
 *           description: ID of the post this comment belongs to
 *           example: 507f1f77bcf86cd799439012
 *         replyToCommentId:
 *           type: object
 *           $ref: '#/components/schemas/CommentWithoutPopulate'
 *         userId:
 *           type: object
 *           $ref: '#/components/schemas/User'
 *         type:
 *           type: string
 *           enum: ["text"]
 *           description: Type of the comment content
 *           example: text
 *         content:
 *           type: object
 *           properties:
 *             text:
 *               $ref: '#/components/schemas/TextPart'
 *           description: The content of the comment. Depending on the 'type', the corresponding property is used - 'text' for text
 *         isDeleted:
 *           type: boolean
 *           description: Whether the comment has been deleted
 *           example: false
 *         isEdited:
 *           type: boolean
 *           description: Whether the comment has been edited
 *           example: false
 *         datetime_created:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the comment was created
 *           example: 2023-01-01T00:00:00Z
 *         last_updated:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the comment was last updated
 *           example: 2023-01-01T00:00:00Z
 *       required:
 *         - postId
 *         - userId
 *         - type
 *         - content
 */
const CommentSchema = new mongoose.Schema(
  {
    postId: { type: mongoose.Types.ObjectId, ref: "Post" },
    replyToCommentId: {
      type: mongoose.Types.ObjectId,
      ref: "Comment",
      default: null,
    },
    userId: { type: mongoose.Types.ObjectId, ref: "User" },
    type: {
      type: String,
      enum: ["text"],
      default: "text",
    },
    content: {
      text: TextPartSchema,
      // image: {
      //   type: [ImagePartSchema],
      //   default: [],
      // },
      // file: FilePartSchema,
    },

    isDeleted: { type: Boolean, default: false },
    isEdited: { type: Boolean, default: false },
  },
  {
    timestamps: { createdAt: "datetime_created", updatedAt: "last_updated" },
  }
);

module.exports = mongoose.model("Comment", CommentSchema);
