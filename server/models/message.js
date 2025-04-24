const mongoose = require("mongoose");

const FileMetaDataSchema = new mongoose.Schema(
  {
    fileName: String,
    fileHash: String,
    mimeType: String,
    size: Number,
  },
  { _id: false }
);

// Image
const ImagePartSchema = new mongoose.Schema(
  {
    metadata: { type: FileMetaDataSchema, default: null },
    image_url: {
      url: String,
    },
    type: { type: String, enum: ["image_url"], default: "image_url" },
  },
  { _id: false }
);

// Audio
const AudioPartSchema = new mongoose.Schema(
  {
    metadata: { type: FileMetaDataSchema, default: null },
    input_audio: {
      data: String,
    },
    type: { type: String, enum: ["input_audio"], default: "input_audio" },
  },
  { _id: false }
);

// File
const FilePartSchema = new mongoose.Schema(
  {
    metadata: { type: FileMetaDataSchema, default: null },
    file: {
      file_data: String,
      file_id: String,
      filename: String,
    },
    type: { type: String, enum: ["file"], default: "file" },
  },
  { _id: false }
);

// Text
const TextPartSchema = new mongoose.Schema(
  {
    text: String,
    type: { type: String, enum: ["text"], default: "text" },
  },
  { _id: false }
);

// Tổng hợp Message
const MessageSchema = new mongoose.Schema({
  id: { type: String, required: true },
  conversationId: { type: mongoose.Types.ObjectId, ref: "Conversation" },
  senderId: { type: mongoose.Types.ObjectId, ref: "User" },

  type: {
    type: String,
    enum: ["text", "file", "image", "audio"],
    default: "text",
    index: true,
  },

  content: {
    text: TextPartSchema,
    image: ImagePartSchema,
    audio: AudioPartSchema,
    file: FilePartSchema,
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  isDeleted: { type: Boolean, default: false },
  isEdited: { type: Boolean, default: false },
  replyToMessageId: { type: String, default: null },
});

MessageSchema.index({ "content.text.text": "text" });

module.exports = mongoose.model("Message", MessageSchema);
