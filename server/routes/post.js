const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth");
const { validateMiddleware } = require("../middleware/validate");
const { check } = require("express-validator");
const PostService = require("../services/post");

router.use(authMiddleware);

/**
 * @openapi
 * /api/post/create-post:
 *   post:
 *     tags:
 *       - Post
 *     summary: Create a new post
 *     description: Creates a new post with the provided content. The content must be an array of objects, each with a `type` (text, image, or file) and `data`.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     type:
 *                       type: string
 *                       enum: ["text", "image", "file"]
 *                       description: Type of the content part
 *                     data:
 *                       type: string
 *                       description: Data for the content part
 *                   required:
 *                     - type
 *                     - data
 *                 minItems: 1
 *                 description: Array of content parts
 *             required:
 *               - content
 *     responses:
 *       200:
 *         description: Post created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 post:
 *                   $ref: '#/components/schemas/Post'
 *       400:
 *         description: Validation error or invalid content
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
router.post(
  "/create-post",
  [
    check("content")
      .isArray({ min: 1 })
      .withMessage("Content must not be empty")
      .custom((value) => {
        const isValid = value.every((part) => {
          return (
            (part.type === "text" ||
              part.type === "image" ||
              part.type === "file") &&
            part.data.length > 0
          );
        });
        return isValid;
      })
      .withMessage(
        "Invalid content type. Content must be an array of objects with type and data properties."
      ),
  ],
  validateMiddleware,
  PostService.createPost.bind(PostService)
);

/**
 * @openapi
 * /api/post/edit-post:
 *   put:
 *     tags:
 *       - Post
 *     summary: Edit an existing post
 *     description: Edits the content of an existing post. The authenticated user must be the owner of the post.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               postId:
 *                 type: string
 *                 description: ID of the post to edit
 *               newContent:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     type:
 *                       type: string
 *                       enum: ["text", "image", "file"]
 *                       description: Type of the content part
 *                     data:
 *                       type: string
 *                       description: Data for the content part
 *                   required:
 *                     - type
 *                     - data
 *                 minItems: 1
 *                 description: New content for the post
 *             required:
 *               - postId
 *               - newContent
 *     responses:
 *       200:
 *         description: Post updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Post'
 *       400:
 *         description: Validation error, post not found, or user is not the owner
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
router.put(
  "/edit-post",
  [
    check("postId").isLength({ min: 1 }).withMessage("postId must be string"),
    check("newContent")
      .isArray({ min: 1 })
      .withMessage("Content must not be empty")
      .custom((value) => {
        const isValid = value.every((part) => {
          return (
            (part.type === "text" ||
              part.type === "image" ||
              part.type === "file") &&
            part.data.length > 0
          );
        });
        return isValid;
      })
      .withMessage(
        "Invalid content type. Content must be an array of objects with type and data properties."
      ),
  ],
  validateMiddleware,
  PostService.editPost.bind(PostService)
);

/**
 * @openapi
 * /api/post/delete-post:
 *   put:
 *     tags:
 *       - Post
 *     summary: Delete a post
 *     description: Deletes a post by setting its `isDeleted` flag to true. The authenticated user must be the owner of the post.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               postId:
 *                 type: string
 *                 description: ID of the post to delete
 *             required:
 *               - postId
 *     responses:
 *       200:
 *         description: Post deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Validation error, post not found, or user is not the owner
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
router.put(
  "/delete-post",
  [check("postId").isLength({ min: 1 }).withMessage("postId must be string")],
  validateMiddleware,
  PostService.deletePost.bind(PostService)
);

/**
 * @openapi
 * /api/post/get-posts:
 *   get:
 *     tags:
 *       - Post
 *     summary: Get posts from connected users
 *     description: Retrieves posts from users that the authenticated user is connected to via conversations, with pagination.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of posts per page
 *     responses:
 *       200:
 *         description: Posts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Post'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
router.get("/get-posts", PostService.getPosts.bind(PostService));

/**
 * @openapi
 * /api/post/get-posts-by-user:
 *   get:
 *     tags:
 *       - Post
 *     summary: Get posts by the authenticated user
 *     description: Retrieves posts created by the authenticated user, with pagination.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of posts per page
 *     responses:
 *       200:
 *         description: Posts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Post'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
router.get(
  "/get-posts-by-user",
  PostService.getPostsByUserId.bind(PostService)
);

/**
 * @openapi
 * /api/post/get-post/{postId}:
 *   get:
 *     tags:
 *       - Post
 *     summary: Get a post by ID
 *     description: Retrieves a specific post by its ID, including its comments and reactions.
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the post to retrieve
 *     responses:
 *       200:
 *         description: Post retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     post:
 *                       $ref: '#/components/schemas/Post'
 *                     comments:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Comment'
 *                     reacts:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/React'
 *       400:
 *         description: Validation error or post not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
router.get(
  "/get-post/:postId",
  [check("postId").isLength({ min: 1 }).withMessage("postId must be string")],
  validateMiddleware,
  PostService.getPostById.bind(PostService)
);

/**
 * @openapi
 * /api/post/react-to-post:
 *   post:
 *     tags:
 *       - Post
 *     summary: React to a post
 *     description: Adds or updates a reaction to a post. The reaction type must be one of ["like", "love", "haha", "wow", "sad", "angry"].
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               postId:
 *                 type: string
 *                 description: ID of the post to react to
 *               type:
 *                 type: string
 *                 enum: ["like", "love", "haha", "wow", "sad", "angry"]
 *                 description: Type of reaction
 *             required:
 *               - postId
 *               - type
 *     responses:
 *       200:
 *         description: Post reacted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/React'
 *
 *       400:
 *         description: Validation error or post not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
router.post(
  "/react-to-post",
  [
    check("postId").isLength({ min: 1 }).withMessage("postId must be string"),
    check("type")
      .isIn(["like", "love", "haha", "wow", "sad", "angry"])
      .withMessage("Invalid reaction type"),
  ],
  validateMiddleware,
  PostService.react.bind(PostService)
);

/**
 * @openapi
 * /api/post/unreact-to-post:
 *   put:
 *     tags:
 *       - Post
 *     summary: Unreact to a post
 *     description: Removes the authenticated user's reaction from a post by setting its type to "unreacted".
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               postId:
 *                 type: string
 *                 description: ID of the post to unreact from
 *             required:
 *               - postId
 *     responses:
 *       200:
 *         description: Post unreacted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Validation error, post not found, or no reaction to remove
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
router.put(
  "/unreact-to-post",
  [check("postId").isLength({ min: 1 }).withMessage("postId must be string")],
  validateMiddleware,
  PostService.unReact.bind(PostService)
);

/**
 * @openapi
 * /api/post/comment-to-post:
 *   post:
 *     tags:
 *       - Post
 *     summary: Comment on a post
 *     description: Adds a text comment to a post. Optionally, the comment can reply to another comment.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               postId:
 *                 type: string
 *                 description: ID of the post to comment on
 *               type:
 *                 type: string
 *                 enum: ["text"]
 *                 description: Type of the comment (currently only "text" is supported)
 *               data:
 *                 type: object
 *                 properties:
 *                   type:
 *                     type: string
 *                     enum: ["text"]
 *                   data:
 *                     type: string
 *                     description: Text content of the comment
 *                 required:
 *                   - type
 *                   - data
 *               replyToCommentId:
 *                 type: string
 *                 nullable: true
 *                 description: ID of the comment this comment replies to, if any
 *             required:
 *               - postId
 *               - type
 *               - data
 *     responses:
 *       200:
 *         description: Commented successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Comment'
 *       400:
 *         description: Validation error or post not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
router.post(
  "/comment-to-post",
  [
    check("postId").isLength({ min: 1 }).withMessage("postId must be string"),
    check("type").isIn(["text"]).withMessage("type is invalid"),
    check("data")
      .custom((value) => {
        return (
          typeof value === "object" &&
          value.type === "text" &&
          value.data.length > 0
        );
      })
      .withMessage("data is invalid"),
  ],
  validateMiddleware,
  PostService.comment.bind(PostService)
);

/**
 * @openapi
 * /api/post/edit-comment:
 *   put:
 *     tags:
 *       - Post
 *     summary: Edit a comment
 *     description: Edits the text content of an existing comment. The authenticated user must be the owner of the comment.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               commentId:
 *                 type: string
 *                 description: ID of the comment to edit
 *               newData:
 *                 type: string
 *                 description: New text content for the comment
 *             required:
 *               - commentId
 *               - newData
 *     responses:
 *       200:
 *         description: Comment updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Comment'
 *       400:
 *         description: Validation error, comment not found, or user is not the owner
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
router.put(
  "/edit-comment",
  [
    check("commentId")
      .isLength({ min: 1 })
      .withMessage("commentId must be string"),
    check("newData")
      .custom((value) => typeof value === "string" && value.length > 0)
      .withMessage("newData must be string"),
  ],
  validateMiddleware,
  PostService.editComment.bind(PostService)
);

/**
 * @openapi
 * /api/post/delete-comment:
 *   put:
 *     tags:
 *       - Post
 *     summary: Delete a comment
 *     description: Deletes a comment by setting its `isDeleted` flag to true. The authenticated user must be the owner of the comment.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               commentId:
 *                 type: string
 *                 description: ID of the comment to delete
 *             required:
 *               - commentId
 *     responses:
 *       200:
 *         description: Comment deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Validation error, comment not found, or user is not the owner
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
router.put(
  "/delete-comment",
  [
    check("commentId")
      .isLength({ min: 1 })
      .withMessage("commentId must be string"),
  ],
  validateMiddleware,
  PostService.deleteComment.bind(PostService)
);

/**
 * @openapi
 * /api/post/get-comments/{postId}:
 *   get:
 *     tags:
 *       - Post
 *     summary: Get comments for a post
 *     description: Retrieves comments for a specific post, with pagination.
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the post
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of comments per page
 *     responses:
 *       200:
 *         description: Comments retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Comment'
 *       400:
 *         description: Validation error or post not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
router.get(
  "/get-comments/:postId",
  [check("postId").isLength({ min: 1 }).withMessage("postId must be string")],
  validateMiddleware,
  PostService.getCommentsByPostId.bind(PostService)
);

/**
 * @openapi
 * /api/post/get-comments-by-user:
 *   get:
 *     tags:
 *       - Post
 *     summary: Get comments by the authenticated user
 *     description: Retrieves comments made by the authenticated user, with pagination.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of comments per page
 *     responses:
 *       200:
 *         description: Comments retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Comment'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
router.get(
  "/get-comments-by-user",
  PostService.getCommentsByUserId.bind(PostService)
);

module.exports = router;
