const ConversationSchema = new mongoose.Schema({
  name: { type: String },
  isGroup: { type: Boolean, default: false },
  members: [
    {
      id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      role: { type: String, enum: ["member", "leader"], default: "member" },
    },
  ],
  lastMessage: {
    type: mongoose.Types.ObjectId,
    ref: "Message",
    default: null,
  },
  isCalling: {
    type: Boolean,
    default: false,
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Conversation", conversationSchema);
