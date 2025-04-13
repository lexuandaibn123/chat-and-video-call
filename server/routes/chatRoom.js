const express = require("express");
const { check } = require("express-validator");
const route = express.Router();
const ChatRoomService = require("../services/chatRoom");

/**
 * @openapi
 * /chatrooms:
 *   post:
 *     summary: Create a chat room
 */
route.post(
  "/",
  [
    check("name", "Name is required").notEmpty(),
    check("members", "Members must be an array of user IDs").isArray(),
  ],
  (req, res) => ChatRoomService.createRoom(req, res) // Sử dụng arrow function để giữ ngữ cảnh this
);

/**
 * @openapi
 * /chatrooms/user/{userId}:
 *   get:
 *     summary: Get all chat rooms of a user
 */
route.get(
  "/user/:userId",
  (req, res) => ChatRoomService.getUserRooms(req, res) // Sử dụng arrow function để giữ ngữ cảnh this
);

/**
 * @openapi
 * /chatrooms/search:
 *   get:
 *     summary: Find chat rooms by name
 */
route.get(
  "/search",
  (req, res) => ChatRoomService.findRoomByName(req, res) // Sử dụng arrow function để giữ ngữ cảnh this
);

/**
 * @openapi
 * /chatrooms/{id}:
 *   get:
 *     summary: Get a chat room by ID
 */
route.get(
  "/:id",
  (req, res) => ChatRoomService.findRoomById(req, res) // Sử dụng arrow function để giữ ngữ cảnh this
);

/**
 * @openapi
 * /chatrooms/{id}/add-user:
 *   post:
 *     summary: Add user to chat room
 */
route.post(
  "/:id/add-user",
  [check("userId", "User ID is required").notEmpty()],
  (req, res) => ChatRoomService.addUser(req, res) // Sử dụng arrow function để giữ ngữ cảnh this
);

/**
 * @openapi
 * /chatrooms/{id}/remove-user:
 *   post:
 *     summary: Remove user from chat room
 */
route.post(
  "/:id/remove-user",
  [check("userId", "User ID is required").notEmpty()],
  (req, res) => ChatRoomService.removeUser(req, res) // Sử dụng arrow function để giữ ngữ cảnh this
);

/**
 * @openapi
 * /chatrooms/{id}/update-leader:
 *   post:
 *     summary: Update room leader
 */
route.post(
  "/:id/update-leader",
  [check("newLeaderId", "New leader ID is required").notEmpty()],
  (req, res) => ChatRoomService.changeLeader(req, res) // Sử dụng arrow function để giữ ngữ cảnh this
);

module.exports = route;
