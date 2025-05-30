const React = require("../models/react");
class ReactRepository {
  async create(data) {
    return await React.create(data);
  }

  async findById(id) {
    return await React.findOne({ _id: id, isDeleted: false }).populate(
      "userId",
      "-password -verificationToken -resetToken -resetTokenExpiry"
    );
  }

  async updateById(id, data) {
    return await React.findByIdAndUpdate(id, { ...data }, { new: true });
  }

  async findByUserId(userId, page = 1, limit = 10, query = {}) {
    return React.find({
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
      .sort({ last_updated: -1 });
  }

  async findByPostId(postId, page = 1, limit = 10) {
    return React.find({
      isDeleted: false,
      postId,
    })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate(
        "userId",
        "-password -verificationToken -resetToken -resetTokenExpiry"
      )
      .sort({ last_updated: -1 });
  }
  async findByPostIdAndUserId(postId, userId, page = 1, limit = 10) {
    return React.findOne({
      postId,
      userId,
    })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate(
        "userId",
        "-password -verificationToken -resetToken -resetTokenExpiry"
      )
      .sort({ last_updated: -1 });
  }

  async hasUserReacted(postId, userId) {
    const react = await React.findOne({
      postId,
      userId,
      type: {
        $ne: "unreacted",
      },
    });
    return !!react;
  }
}

module.exports = new ReactRepository();
