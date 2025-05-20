const express = require("express");
const router = express.Router();
const { check, param } = require("express-validator"); // For validation
const { validateMiddleware } = require("../middleware/validate");
const UserService = require("../services/user");
const { authMiddleware } = require("../middleware/auth");
router.use(authMiddleware);

/**
 * @openapi
 * /api/user/email/{email}:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get user by email
 *     description: Retrieves a user by their email address.
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         description: The email address of the user to retrieve
 *     responses:
 *       200:
 *         description: User found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: User found
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     fullName:
 *                       type: string
 *                     email:
 *                       type: string
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: User not found
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Internal server error
 */
router.get(
  "/email/:email",
  [param("email").isEmail().withMessage("Valid email is required")],
  validateMiddleware,
  UserService.findUserByEmail
);

/**
 * @openapi
 * /api/user/search:
 *   get:
 *     tags:
 *       - Users
 *     summary: Search users by name
 *     description: Searches for users by name among members of conversations the current user is part of. Requires authentication via session.
 *     parameters:
 *       - in: query
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: The name to search for
 *     responses:
 *       200:
 *         description: Users found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Users found
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       fullName:
 *                         type: string
 *                       email:
 *                         type: string
 *       400:
 *         description: Bad request (e.g., invalid query or session data)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Error message
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Internal server error
 */
router.get("/search", UserService.findUsersByName);

/**
 * @openapi
 * /api/user/friends:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get friends of the current user
 *     description: Retrieves a list of friends for the current user, optionally filtered by name. Friends are determined based on non-group conversations the user is part of. Requires authentication via session.
 *     parameters:
 *       - in: query
 *         name: name
 *         required: false
 *         schema:
 *           type: string
 *         description: Optional name to filter friends by (case-insensitive)
 *     responses:
 *       200:
 *         description: Friends found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Users found
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       fullName:
 *                         type: string
 *                       email:
 *                         type: string
 *                       # Add other user fields as necessary
 *       400:
 *         description: Bad request (e.g., invalid query or session data)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Error message
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Internal server error
 */

router.get("/friends", UserService.getFriends);

/**
 * @openapi
 * /api/user/potential-friends:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get potential friends for the current user
 *     description: Retrieves a list of potential friends for the current user, optionally filtered by name. Potential friends are users who are in the same group conversations as the current user or are friends of the current user's friends, but are not already friends with the current user. The response includes information about shared groups and mutual friends. Requires authentication via session.
 *     parameters:
 *       - in: query
 *         name: name
 *         required: false
 *         schema:
 *           type: string
 *         description: Optional name to filter potential friends by (case-insensitive)
 *     responses:
 *       200:
 *         description: Potential friends found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Potential friends found
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       info:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           fullName:
 *                             type: string
 *                           email:
 *                             type: string
 *                           # Add other user fields as necessary
 *                       sharedGroups:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             _id:
 *                               type: string
 *                             name:
 *                               type: string
 *                             # Add other conversation fields as necessary
 *                       mutualFriends:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             _id:
 *                               type: string
 *                             fullName:
 *                               type: string
 *                             email:
 *                               type: string
 *                             # Add other user fields as necessary
 *       400:
 *         description: Bad request (e.g., invalid query or session data)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Error message
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Internal server error
 */
router.get("/potential-friends", UserService.getPotentialFriends);

/**
 * @openapi
 * /api/user/update-name:
 *   put:
 *     tags:
 *       - Users
 *     summary: Update user name
 *     description: Updates the name of the current user. Requires authentication via session.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *                 description: The new fullName
 *             required:
 *               - fullName
 *     responses:
 *       200:
 *         description: User name updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: User name updated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     fullName:
 *                       type: string
 *                     email:
 *                       type: string
 *                     avatar:
 *                       type: string
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: User not found
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Internal server error
 */
router.put(
  "/update-name",
  [check("fullName").isLength({ min: 1 }).withMessage("Full name is required")],
  validateMiddleware,
  UserService.updateUserName
);

/**
 * @openapi
 * /api/user/update-avatar:
 *   put:
 *     tags:
 *       - Users
 *     summary: Update user avatar
 *     description: Updates the avatar of the current user. Requires authentication via session.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 description: The new avatar URL or identifier
 *             required:
 *               - avatar
 *     responses:
 *       200:
 *         description: User avatar updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: User avatar updated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     fullName:
 *                       type: string
 *                     email:
 *                       type: string
 *                     avatar:
 *                       type: string
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: User not found
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Internal server error
 */
router.put(
  "/update-avatar",
  [check("avatar").isURL().withMessage("Avatar must be a valid URL")],
  validateMiddleware,
  UserService.updateUserAvatar
);

/**
 * @openapi
 * /api/user/{id}:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get user by ID
 *     description: Retrieves a user by their ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user to retrieve
 *     responses:
 *       200:
 *         description: User found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: User found
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     fullName:
 *                       type: string
 *                     email:
 *                       type: string
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: User not found
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Internal server error
 */
router.get(
  "/:id",
  [param("id").isLength({ min: 1 }).withMessage("ID is required")],
  validateMiddleware,
  UserService.findUserById
);
module.exports = router;
