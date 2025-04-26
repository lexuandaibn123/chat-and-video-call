const mongoose = require("mongoose");
/**
 * @openapi
 * components:
 *   schemas:
 *     Member:
 *       type: object
 *       properties:
 *         id:
 *           $ref: '#/components/schemas/User'
 *           description: Public information of the user (excluding password)
 *         role:
 *           type: string
 *           enum: ["member", "leader"]
 *           default: "member"
 *           description: Role of the member in the conversation
 *           example: member
 *         joinedAt:
 *           type: string
 *           format: date-time
 *           description: Date when the member joined the conversation
 *           example: 2023-10-01T12:00:00Z
 *         leftAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Date when the member left the conversation (if applicable)
 *           example: null
 *         latestDeletedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Date of the most recent message deletion by the member (if applicable)
 *           example: null
 *       required:
 *         - id
 *         - role
 *         - joinedAt
 *
 *     MemberWithoutPopulate:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: User ID (ObjectId)
 *           example: 67e4f4edad940b829cbc56cb
 *         role:
 *           type: string
 *           enum: ["member", "leader"]
 *           default: "member"
 *           description: Role of the member in the conversation
 *           example: member
 *         joinedAt:
 *           type: string
 *           format: date-time
 *           description: Date when the member joined the conversation
 *           example: 2023-10-01T12:00:00Z
 *         leftAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Date when the member left the conversation (if applicable)
 *           example: null
 *         latestDeletedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Date of the most recent message deletion by the member (if applicable)
 *           example: null
 *       required:
 *         - id
 *         - role
 *         - joinedAt
 *
 *     ConversationWithoutPopulate:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Conversation ID (ObjectId)
 *           example: 0987654321
 *         name:
 *           type: string
 *           description: Name of the conversation (optional)
 *           example: Group Chat
 *         isGroup:
 *           type: boolean
 *           default: false
 *           description: Indicates whether the conversation is a group
 *           example: true
 *         members:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/MemberWithoutPopulate'
 *           minItems: 2
 *           description: List of members in the conversation (at least 2 members)
 *         latestMessage:
 *           type: string
 *           nullable: true
 *           description: ID of the latest message in the conversation (ObjectId)
 *           example: null
 *         isDeleted:
 *           type: boolean
 *           default: false
 *           description: Deletion status of the conversation
 *           example: false
 *         datetime_created:
 *           type: string
 *           format: date-time
 *           description: Date when the conversation was created
 *           example: 2023-10-01T12:00:00Z
 *         last_updated:
 *           type: string
 *           format: date-time
 *           description: Date of the most recent update to the conversation
 *           example: 2023-10-02T12:00:00Z
 *       required:
 *         - members
 *         - datetime_created
 *         - last_updated
 *
 *     Conversation:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Conversation ID (ObjectId)
 *           example: 0987654321
 *         name:
 *           type: string
 *           description: Name of the conversation (optional)
 *           example: Group Chat
 *         isGroup:
 *           type: boolean
 *           default: false
 *           description: Indicates whether the conversation is a group
 *           example: true
 *         members:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Member'
 *           minItems: 2
 *           description: List of members in the conversation (at least 2 members)
 *         latestMessage:
 *           $ref: '#/components/schemas/Message'
 *           nullable: true
 *         isDeleted:
 *           type: boolean
 *           default: false
 *           description: Deletion status of the conversation
 *           example: false
 *         datetime_created:
 *           type: string
 *           format: date-time
 *           description: Date when the conversation was created
 *           example: 2023-10-01T12:00:00Z
 *         last_updated:
 *           type: string
 *           format: date-time
 *           description: Date of the most recent update to the conversation
 *           example: 2023-10-02T12:00:00Z
 *       required:
 *         - members
 *         - datetime_created
 *         - last_updated
 */
const MemberSchema = new mongoose.Schema(
  {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: ["member", "leader"],
      default: "member",
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    leftAt: {
      type: Date,
      default: null,
    },
    latestDeletedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

const ConversationSchema = new mongoose.Schema(
  {
    name: { type: String },
    isGroup: { type: Boolean, default: false },
    members: {
      type: [MemberSchema],
      validate: [
        {
          validator: arrayLimit,
          message: "A conversation must have at least two members",
        },
        {
          validator: hasLeaderIfMoreThanTwo,
          message:
            "If there are more than 2 members, at least one must be a leader",
        },
      ],
    },
    latestMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: { createdAt: "datetime_created", updatedAt: "last_updated" },
  }
);

function arrayLimit(val) {
  return val.length >= 2;
}

function hasLeaderIfMoreThanTwo(val) {
  if (val.length > 2) {
    return val.some((member) => member.role === "leader");
  }
  return true;
}

module.exports = mongoose.model("Conversation", ConversationSchema);
