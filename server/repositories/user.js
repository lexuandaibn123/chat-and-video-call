const User = require("../models/user");

class UserRepository {
  async create(data) {
    return await User.create({ ...data });
  }

  async findById(id) {
    return await User.findById(id);
  }

  async findByIds(ids) {
    return await User.find({ _id: { $in: ids } });
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
    return await User.findByIdAndUpdate(id, { ...data });
  }
}

module.exports = new UserRepository();
