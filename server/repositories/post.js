const Post = require("../models/post");

class PostRepository {
  async create(data) {
    return await Post.create(data);
  }

  async findById(id) {
    return await Post.findOne({ _id: id, isDeleted: false })
      .populate(
        "poster",
        "-password -verificationToken -resetToken -resetTokenExpiry"
      )
      .sort({ last_updated: -1 });
  }

  async updateById(id, data) {
    return await Post.findByIdAndUpdate(id, { ...data }, { new: true });
  }

  async findByUserId(userId, page = 1, limit = 10, query = {}) {
    return Post.find({
      isDeleted: false,
      poster: userId,
      ...query,
    })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate(
        "poster",
        "-password -verificationToken -resetToken -resetTokenExpiry"
      )
      .sort({ last_updated: -1 });
  }

  async findByUserIds(ids, page = 1, limit = 10, query = {}, select = "") {
    return await Post.find({ poster: { $in: ids }, ...query }, select)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate(
        "poster",
        "-password -verificationToken -resetToken -resetTokenExpiry"
      )
      .sort({ last_updated: -1 });
  }

  async findAll(page = 1, limit = 10, query = {}) {
    return Post.find({
      isDeleted: false,
      ...query,
    })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate(
        "poster",
        "-password -verificationToken -resetToken -resetTokenExpiry"
      )
      .sort({ last_updated: -1 });
  }
}

module.exports = new PostRepository();
