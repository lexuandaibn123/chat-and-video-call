const mongoose = require("mongoose");

const chatRoomSchema = new mongoose.Schema({
  name: { type: String }, // Chỉ cần nếu là nhóm
  isGroup: { type: Boolean, default: false },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("ChatRoom", chatRoomSchema);
