const mongoose = require("mongoose");
/**
 * @openapi
 * components:
 *   schemas:
 *     ReactWithoutPopulate:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Unique identifier of the reaction
 *           example: 507f1f77bcf86cd799439011
 *         postId:
 *           type: string
 *           description: ID of the post being reacted to
 *           example: 507f1f77bcf86cd799439012
 *         userId:
 *           type: string
 *           description: ID of the user who reacted
 *           example: 507f1f77bcf86cd799439013
 *         type:
 *           type: string
 *           enum: ["like", "love", "haha", "wow", "sad", "angry"]
 *           description: Type of reaction
 *           example: like
 *         datetime_created:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the reaction was created
 *           example: 2023-01-01T00:00:00Z
 *         last_updated:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the reaction was last updated
 *           example: 2023-01-01T00:00:00Z
 *       required:
 *         - postId
 *         - userId
 *         - type
 *
 *     React:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Unique identifier of the reaction
 *           example: 507f1f77bcf86cd799439011
 *         postId:
 *           type: string
 *           description: ID of the post being reacted to
 *           example: 507f1f77bcf86cd799439012
 *         userId:
 *           type: object
 *           $ref: '#/components/schemas/User'
 *         type:
 *           type: string
 *           enum: ["like", "love", "haha", "wow", "sad", "angry"]
 *           description: Type of reaction
 *           example: like
 *         datetime_created:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the reaction was created
 *           example: 2023-01-01T00:00:00Z
 *         last_updated:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the reaction was last updated
 *           example: 2023-01-01T00:00:00Z
 *       required:
 *         - postId
 *         - userId
 *         - type
 */
const ReactSchema = new mongoose.Schema(
  {
    postId: { type: mongoose.Types.ObjectId, ref: "Post" },
    userId: { type: mongoose.Types.ObjectId, ref: "User" },
    type: {
      type: String,
      enum: ["like", "love", "haha", "wow", "sad", "angry", "unreacted"],
    },
  },
  {
    timestamps: { createdAt: "datetime_created", updatedAt: "last_updated" },
  }
);

module.exports = mongoose.model("React", ReactSchema);
