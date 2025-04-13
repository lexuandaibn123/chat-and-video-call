const mongoose = require("mongoose");

const ChatRoomSchema = new mongoose.Schema({
  name: { type: String }, // Tên nhóm nếu là group
  isGroup: { type: Boolean, default: false },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  leader: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("ChatRoom", ChatRoomSchema);
