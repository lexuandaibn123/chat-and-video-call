const express = require("express");
const route = express.Router();
const ConversationService = require("../services/conversation");

/**
 * @openapi
 * /conversations:
 *   post:
 *     summary: Create a chat room
 */
router.post("/createChat", async (req, res) => {
  await ConversationService.create11Conversation(req, res);
});

router.post("/createGroup", async (req, res) => {
  await ConversationService.createGroupConversation(req, res);
});
// Lấy chi tiết 1 phòng theo ID
router.get("/:id", async (req, res) => {
  await ConversationService.getConversationById(req, res);
});

// Tìm phòng theo tên (dùng query ?name=abc&page=1&limit=10)
router.get("/search", async (req, res) => {
  await ConversationService.searchByName(req, res);
});

// Lấy danh sách các cuộc trò chuyện mà user tham gia
router.get("/user/:userId", async (req, res) => {
  await ConversationService.getUserConversations(req, res);
});
/**
 * @openapi
 * /conversations/{id}/add-user:
 *   post:
 *     summary: Add user to chat room
 */
router.put("/add-member/:requesterId", async (req, res) => {
  await ConversationService.addMember(req, res);
});

/**
 * @openapi
 * /conversations/{id}/remove-user:
 *   post:
 *     summary: Remove user from chat room
 */
router.put("/remove-member/:requesterId", async (req, res) => {
  await ConversationService.removeMember(req, res);
});

// Rời nhóm (nếu là leader cuối thì phải chuyển quyền trước)
router.put("/leave/:userId", async (req, res) => {
  await ConversationService.leaveConversation(req, res);
});

// Xóa nhóm (chỉ leader mới có quyền)
router.delete("/delete/:requesterId", async (req, res) => {
  await ConversationService.deleteConversation(req, res);
});

// Chuyển quyền leader (chỉ leader mới được làm)
router.put("/transfer-leadership/:requesterId", async (req, res) => {
  await ConversationService.transferLeadership(req, res);
});

// Đổi tên nhóm (chỉ leader mới được đổi)
router.put("/update-room-name/:requesterId", async (req, res) => {
  await ConversationService.updateRoomName(req, res);
});

router.put("/add-leader/:requesterId", async (req, res) => {
  await ConversationService.addLeader(req, res);
});

// Rời khỏi vai trò leader (chỉ leader mới được và phải còn ít nhất 1 leader)
router.put("/remove-self-leader/:userId", async (req, res) => {
  await ConversationService.removeSelfAsLeader(req, res);
});
