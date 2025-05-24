const User = require("../models/user");

class UserRepository {
  async create(data) {
    return await User.create({ ...data });
  }

  async findById(id) {
    return await User.findById(id);
  }

  async findByIds(ids, query = {}, select = "") {
    return await User.find({ _id: { $in: ids }, ...query }, select);
  }

  async findByEmail(email) {
    return await User.findOne({ email });
  }

  async findUsersByName(name) {
    return await User.find({ fullName: { $regex: name, $options: "i" } });
  }

  async findByVerificationToken(token) {
    return await User.findOne({ verificationToken: token });
  }

  async findByResetToken(token) {
    return await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() },
    });
  }

  async findOrCreateUser(data) {
    const user = await this.findByEmail(data.email);

    if (user) {
      return user;
    }

    return await this.create({ ...data });
  }

  async updateById(id, data) {
    return await User.findByIdAndUpdate(
      id,
      { ...data },
      {
        new: true, // Return the updated document
        select: "-password -verificationToken -resetToken -resetTokenExpiry", // Exclude fields
      }
    );
  }

  async getRandomUsers(excludeIds = [], page = 1, limit = 10) {
    const pg = Number(page) || 1;
    const lim = Number(limit) || 10;
    const skipCount = (pg - 1) * lim;

    const pipeline = [
      { $match: { _id: { $nin: excludeIds } } },
      { $sample: { size: pg * lim } },
      { $skip: skipCount },
      { $limit: lim },
      {
        $project: {
          password: 0,
          verificationToken: 0,
          resetToken: 0,
          resetTokenExpiry: 0,
        },
      },
    ];

    return User.aggregate(pipeline).exec();
  }
}

module.exports = new UserRepository();
