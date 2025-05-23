const PostRepository = require("../repositories/post");
const CommentRepository = require("../repositories/comment");
const ReactRepository = require("../repositories/react");
const ConversationRepository = require("../repositories/conversation");

class PostService {
  async _mustBeValidPost(postId) {
    const post = await PostRepository.findById(postId);
    if (!post) {
      throw new Error("Post not found");
    }

    return post;
  }

  async _mustBeValidComment(commentId) {
    const comment = await CommentRepository.findById(commentId);
    if (!comment) {
      throw new Error("Comment not found");
    }
    return comment;
  }

  _isOwnerOfPost(post, userId) {
    if (!post.poster) return false;
    if (typeof post.poster === "string")
      return post.poster.toString() == userId;
    else if (typeof post.poster === "object")
      return post.poster._id.toString() == userId;
    else throw new Error("Invalid post");
  }

  _mustBeOwnerOfPost(post, userId, errorMsg = "") {
    if (!this._isOwnerOfPost(post, userId)) {
      if (errorMsg.length > 0) throw new Error(errorMsg);
      throw new Error("You are not the owner of this post");
    }
  }

  _isOwnerOfComment(comment, userId) {
    if (!comment.userId) return false;
    if (typeof comment.userId === "string")
      return comment.userId.toString() == userId;
    else if (typeof comment.userId === "object")
      return comment.userId._id.toString() == userId;
    else throw new Error("Invalid comment");
  }
  _mustBeOwnerOfComment(comment, userId, errorMsg = "") {
    if (!this._isOwnerOfComment(comment, userId)) {
      if (errorMsg.length > 0) throw new Error(errorMsg);
      throw new Error("You are not the owner of this comment");
    }
  }
  async createPost(req, res) {
    try {
      const { content } = req.body;

      const userInfo = req.session.userInfo;

      const posterId = userInfo.id.toString();

      try {
        const post = await PostRepository.create({
          content: content.map((item) => {
            const cloneItem = { ...item };
            if (!cloneItem.contentType) {
              switch (cloneItem.type) {
                case "text":
                  cloneItem.contentType = "TextPart";
                  break;
                case "image":
                  cloneItem.contentType = "ImagePart";
                  break;
                case "file":
                  cloneItem.contentType = "FilePart";
                  break;
                default:
                  throw new Error("Invalid content type");
              }
            }
            return cloneItem;
          }),
          poster: posterId,
        });

        res.status(200).json({
          success: true,
          message: "Post created successfully",
          post: post,
        });
      } catch (error) {
        console.error(error);
        return res.status(400).json({ error: error.message });
      }
    } catch (error) {
      console.error("Error creating post:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  async editPost(req, res) {
    try {
      const { postId, newContent } = req.body;

      const userInfo = req.session.userInfo;

      try {
        const post = await this._mustBeValidPost(postId);
        this._mustBeOwnerOfPost(post, userInfo.id.toString());

        const updatedPost = await PostRepository.updateById(postId, {
          content: [
            ...newContent.map((item) => {
              const cloneItem = { ...item };
              if (!cloneItem.contentType) {
                switch (cloneItem.type) {
                  case "text":
                    cloneItem.contentType = "TextPart";
                    break;
                  case "image":
                    cloneItem.contentType = "ImagePart";
                    break;
                  case "file":
                    cloneItem.contentType = "FilePart";

                    break;
                  default:
                    throw new Error("Invalid content type");
                }
              }
              return cloneItem;
            }),
          ],
          isEdited: true,
        });

        return res.status(200).json({
          success: true,
          message: "Post updated successfully",
          data: updatedPost,
        });
      } catch (error) {
        console.error(error);
        return res.status(400).json({ error: error.message });
      }
    } catch (error) {
      console.error("Error editing post:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  async deletePost(req, res) {
    try {
      const { postId } = req.body;

      const userInfo = req.session.userInfo;

      try {
        const post = await this._mustBeValidPost(postId);
        this._mustBeOwnerOfPost(post, userInfo.id.toString());

        await PostRepository.updateById(postId, { isDeleted: true });

        return res.status(200).json({
          success: true,
          message: "Post deleted successfully",
        });
      } catch (error) {
        console.error(error);
        return res.status(400).json({ error: error.message });
      }
    } catch (error) {
      console.error("Error deleting post:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  async getPosts(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const userInfo = req.session.userInfo;
      try {
        const conversations = [
          ...(await ConversationRepository.findByUserId(userInfo.id, 1, 0, {
            isGroup: false,
          })),
          ...(await ConversationRepository.findByUserId(userInfo.id, 1, 0, {
            isGroup: true,
          })),
        ];

        const memberIds = [
          ...new Set(
            conversations
              .flatMap((conversation) => conversation.members)
              .filter((member) => member.id !== null)
              .map((member) =>
                typeof member.id === "object"
                  ? member.id._id.toString()
                  : member.id.toString()
              )
          ),
        ];

        const posts = await Promise.all(
          (
            await PostRepository.findByUserIds(memberIds, page, limit, {
              isDeleted: false,
            })
          ).map(async (post) => {
            const hasUserReacted = await ReactRepository.hasUserReacted(
              post._id.toString(),
              userInfo.id.toString()
            );
            return {
              ...post.toObject(),
              hasUserReacted,
            };
          })
        );

        return res.status(200).json({
          success: true,
          message: "Posts retrieved successfully",
          data: posts,
        });
      } catch (error) {
        console.error(error);
        return res.status(400).json({ error: error.message });
      }
    } catch (error) {
      console.error("Error retrieving posts:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  async getPostsByUserId(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;

      const userInfo = req.session.userInfo;

      try {
        const posts = await Promise.all(
          (
            await PostRepository.findByUserId(
              userInfo.id.toString(),
              page,
              limit
            )
          ).map(async (post) => {
            const hasUserReacted = await ReactRepository.hasUserReacted(
              post._id.toString(),
              userInfo.id.toString()
            );
            return {
              ...post.toObject(),
              hasUserReacted,
            };
          })
        );

        return res.status(200).json({
          success: true,
          message: "Posts retrieved successfully",
          data: posts,
        });
      } catch (error) {
        console.error(error);
        return res.status(400).json({ error: error.message });
      }
    } catch (error) {
      console.error("Error retrieving posts:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  async getPostById(req, res) {
    try {
      const { postId } = req.params;

      try {
        const post = await this._mustBeValidPost(postId);

        const comments = await CommentRepository.findByPostId(postId);
        const reacts = await ReactRepository.findByPostId(postId);

        const hasUserReacted = await ReactRepository.hasUserReacted(
          post._id.toString(),
          req.session.userInfo.id.toString()
        );

        return res.status(200).json({
          success: true,
          message: "Post retrieved successfully",
          data: { post, comments, reacts, hasUserReacted },
        });
      } catch (error) {
        console.error(error);
        return res.status(400).json({ error: error.message });
      }
    } catch (error) {
      console.error("Error retrieving post:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  async react(req, res) {
    try {
      const { postId, type } = req.body;

      const userInfo = req.session.userInfo;

      try {
        await this._mustBeValidPost(postId);

        const react = await ReactRepository.findByPostIdAndUserId(
          postId,
          userInfo.id.toString()
        );

        let data;

        if (react) {
          data = await ReactRepository.updateById(react._id, { type });
        } else {
          data = await ReactRepository.create({
            postId,
            userId: userInfo.id.toString(),
            type,
          });
          await PostRepository.updateById(postId, {
            $push: { reacts: { react: data._id } },
          });
        }
        return res.status(200).json({
          success: true,
          message: "Post reacted successfully",
          data,
        });
      } catch (error) {
        console.error(error);
        return res.status(400).json({ error: error.message });
      }
    } catch (error) {
      console.error("Error reacting to post:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  async unReact(req, res) {
    try {
      const { postId } = req.body;

      const userInfo = req.session.userInfo;

      try {
        await this._mustBeValidPost(postId);

        const react = await ReactRepository.findByPostIdAndUserId(
          postId,
          userInfo.id.toString()
        );
        if (!react) {
          return res.status(400).json({
            success: false,
            message: "You have not reacted to this post",
          });
        }
        await ReactRepository.updateById(react._id, { type: "unreacted" });

        return res.status(200).json({
          success: true,
          message: "Post unreacted successfully",
        });
      } catch (error) {
        console.error(error);
        return res.status(400).json({ error: error.message });
      }
    } catch (error) {
      console.error("Error unreacting to post:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  async comment(req, res) {
    try {
      const { postId, data, type, replyToCommentId = null } = req.body;

      // data phải có type là TextPartSchema | [ImagePartSchema] | FilePartSchema

      const userInfo = req.session.userInfo;

      try {
        await this._mustBeValidPost(postId);

        let commentObj = {
          postId,
          userId: userInfo.id,
          replyToCommentId,
        };

        switch (type) {
          case "text":
            commentObj.type = "text";
            commentObj.content = {};
            commentObj.content.text = { ...data };
            break;
          // case "image":
          //   commentObj.type = "image";
          //   commentObj.content = {};
          //   commentObj.content.image = [...data];
          //   break;
          // case "file":
          //   commentObj.type = "file";
          //   commentObj.content = {};
          //   commentObj.content.file = { ...data };
          //   break;
          default:
            return res.status(400).json({ error: "Invalid message type" });
        }

        const comment = await CommentRepository.create(commentObj);

        await PostRepository.updateById(postId, {
          $push: { comments: { comment: comment._id } },
        });

        return res.status(200).json({
          success: true,
          message: "Commented successfully",
          data: comment,
        });
      } catch (error) {
        console.error(error);
        return res.status(400).json({ error: error.message });
      }
    } catch (error) {
      console.error("Error commenting on post:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  async editComment(req, res) {
    try {
      const { commentId, newData } = req.body;

      const userInfo = req.session.userInfo;

      try {
        const comment = await this._mustBeValidComment(commentId);

        this._mustBeOwnerOfComment(comment, userInfo.id.toString());

        const newContent = {
          text: {
            type: "text",
            data: newData,
          },
        };

        const updatedComment = await CommentRepository.updateById(commentId, {
          content: { ...newContent },
          isEdited: true,
        });

        return res.status(200).json({
          success: true,
          message: "Comment updated successfully",
          data: updatedComment,
        });
      } catch (error) {
        console.error(error);
        return res.status(400).json({ error: error.message });
      }
    } catch (error) {
      console.error("Error editing comment:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  async deleteComment(req, res) {
    try {
      const { commentId } = req.body;

      const userInfo = req.session.userInfo;

      try {
        const comment = await this._mustBeValidComment(commentId);

        this._mustBeOwnerOfComment(comment, userInfo.id.toString());

        await CommentRepository.updateById(commentId, { isDeleted: true });

        return res.status(200).json({
          success: true,
          message: "Comment deleted successfully",
        });
      } catch (error) {
        console.error(error);
        return res.status(400).json({ error: error.message });
      }
    } catch (error) {
      console.error("Error deleting comment:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
  async getCommentsByPostId(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;

      const { postId } = req.params;

      try {
        await this._mustBeValidPost(postId);

        const comments = await CommentRepository.findByPostId(
          postId,
          page,
          limit
        );

        return res.status(200).json({
          success: true,
          message: "Comments retrieved successfully",
          data: comments,
        });
      } catch (error) {
        console.error(error);
        return res.status(400).json({ error: error.message });
      }
    } catch (error) {
      console.error("Error retrieving comments:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  async getCommentsByUserId(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;

      const userInfo = req.session.userInfo;

      try {
        const comments = await CommentRepository.findByUserId(
          userInfo.id.toString(),
          page,
          limit
        );

        return res.status(200).json({
          success: true,
          message: "Comments retrieved successfully",
          data: comments,
        });
      } catch (error) {
        console.error(error);
        return res.status(400).json({ error: error.message });
      }
    } catch (error) {
      console.error("Error retrieving comments:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
}

module.exports = new PostService();
