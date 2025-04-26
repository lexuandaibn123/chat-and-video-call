const mongoose = require("mongoose");

const Schema = mongoose.Schema;

/**
 * @openapi
 * components:
 *   schemas:
 *     # Schema cho thông tin công khai của User (sau khi populate với "-password", "-verificationToken", "-resetToken", "-resetTokenExpiry")
 *     User:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: ID của người dùng (ObjectId)
 *           example: 1234567890
 *         fullName:
 *           type: string
 *           description: Tên đầy đủ của người dùng
 *           example: John Doe
 *         email:
 *           type: string
 *           description: Địa chỉ email của người dùng
 *           example: user@example.com
 *         emailVerified:
 *           type: boolean
 *           default: false
 *           description: Trạng thái xác thực email
 *           example: false
 *         avatar:
 *           type: string
 *           description: Đường dẫn đến ảnh đại diện
 *           example: /avatars/user123.jpg
 *         isAdmin:
 *           type: boolean
 *           default: false
 *           description: Cho biết người dùng có phải là admin hay không
 *           example: false
 */

const userSchema = new Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  emailVerified: { type: Boolean, default: false },
  verificationToken: { type: String, default: null },
  resetToken: { type: String, default: null },
  resetTokenExpiry: { type: Date, default: null },
  avatar: {
    type: "String",
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
});
module.exports = mongoose.model("User", userSchema);
