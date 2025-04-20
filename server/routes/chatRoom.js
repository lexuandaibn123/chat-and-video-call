const express = require("express");
const { check } = require("express-validator");
const route = express.Router();
const ConversationService = require("../services/conversation");

/**
 * @openapi
 * /conversations:
 *   post:
 *     summary: Create a chat room
 */
route.post(
  "/",
  [
    check("name", "Name is required").notEmpty(),
    check("members", "Members must be an array of user IDs").isArray(),
  ],
  (req, res) => ConversationService.createRoom(req, res) // Sử dụng arrow function để giữ ngữ cảnh this
);

/**
 * @openapi
 * /conversations/user/{userId}:
 *   get:
 *     summary: Get all chat rooms of a user
 */
route.get(
  "/user/:userId",
  (req, res) => ConversationService.getUserRooms(req, res) // Sử dụng arrow function để giữ ngữ cảnh this
);

/**
 * @openapi
 * /conversations/search:
 *   get:
 *     summary: Find chat rooms by name
 */
route.get(
  "/search",
  (req, res) => ConversationService.findRoomByName(req, res) // Sử dụng arrow function để giữ ngữ cảnh this
);

/**
 * @openapi
 * /conversations/{id}:
 *   get:
 *     summary: Get a chat room by ID
 */
route.get(
  "/:id",
  (req, res) => ConversationService.findRoomById(req, res) // Sử dụng arrow function để giữ ngữ cảnh this
);

/**
 * @openapi
 * /conversations/{id}/add-user:
 *   post:
 *     summary: Add user to chat room
 */
route.post(
  "/:id/add-user",
  [check("userId", "User ID is required").notEmpty()],
  (req, res) => ConversationService.addUser(req, res) // Sử dụng arrow function để giữ ngữ cảnh this
);

/**
 * @openapi
 * /conversations/{id}/remove-user:
 *   post:
 *     summary: Remove user from chat room
 */
route.post(
  "/:id/remove-user",
  [check("userId", "User ID is required").notEmpty()],
  (req, res) => ConversationService.removeUser(req, res) // Sử dụng arrow function để giữ ngữ cảnh this
);

/**
 * @openapi
 * /conversations/{id}/update-leader:
 *   post:
 *     summary: Update room leader
 */
route.post(
  "/:id/update-leader",
  [check("newLeaderId", "New leader ID is required").notEmpty()],
  (req, res) => ConversationService.changeLeader(req, res) // Sử dụng arrow function để giữ ngữ cảnh this
);

module.exports = route;
