const Comment = require("../models/comment");
class CommentRepository {
  async create(data) {
    return await Comment.create(data);
  }

  async findById(id) {
    return await Comment.findOne({ _id: id, isDeleted: false })
      .populate(
        "userId",
        "-password -verificationToken -resetToken -resetTokenExpiry"
      )
      .populate("replyToCommentId");
  }

  async updateById(id, data) {
    return await Comment.findByIdAndUpdate(id, { ...data }, { new: true });
  }

  async findByUserId(userId, page = 1, limit = 10, query = {}) {
    return Comment.find({
      isDeleted: false,
      userId,
      ...query,
    })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate(
        "userId",
        "-password -verificationToken -resetToken -resetTokenExpiry"
      )
      .populate("replyToCommentId")
      .sort({ last_updated: -1 });
  }

  async findByPostId(postId, page = 1, limit = 10) {
    return Comment.find({
      isDeleted: false,
      postId,
    })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate(
        "userId",
        "-password -verificationToken -resetToken -resetTokenExpiry"
      )
      .populate("replyToCommentId")
      .sort({ last_updated: -1 });
  }
  async findByPostIdAndUserId(postId, userId, page = 1, limit = 10) {
    return Comment.find({
      isDeleted: false,
      postId,
      userId,
    })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate(
        "userId",
        "-password -verificationToken -resetToken -resetTokenExpiry"
      )
      .populate("replyToCommentId")
      .sort({ last_updated: -1 });
  }
}

module.exports = new CommentRepository();
