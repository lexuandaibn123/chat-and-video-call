const { validationResult } = require("express-validator"); // For validation
const bcrypt = require("bcrypt");
const crypto = require("crypto");

class AuthService {
  async login(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array() });
      }
      const { email, password } = req.body;

      return res
        .status(200)
        .json({ success: true, message: "Login successful" });
    } catch (error) {
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  async register(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array() });
      }
      const { email, password, confirmPassword } = req.body;

      const hashedPassword = await bcrypt.hash(password, 10);
      const verificationToken = crypto.randomBytes(20).toString("hex");
      console.log("Verification token: ", verificationToken);
      console.log("Hashed password: ", hashedPassword);
      const clientUrl = process.env.CLIENT_URL;

      const verificationUrl = `${clientUrl}/auth/verify-email?token=${verificationToken}`;

      return res
        .status(200)
        .json({ success: true, message: "Registration successful" });
    } catch (error) {
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  async verifyEmail(req, res) {
    try {
      const { token } = req.query;
      if (!token) {
        return res.status(400).json({ error: "Invalid token" });
      }
      console.log("Verification token: ", token);
      return res
        .status(200)
        .json({ success: true, message: "Email verification successful" });
    } catch (error) {
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  async resendVerificationEmail(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array() });
      }
      const { email } = req.body;
      console.log("Email: ", email);
      return res
        .status(200)
        .json({ success: true, message: "Verification email sent" });
    } catch (error) {
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  async forgotPassword(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array() });
      }
      const { email } = req.body;
      console.log("Email: ", email);
      const newPassword = crypto.randomBytes(12).toString("hex");
      console.log("New password: ", newPassword);
      const newPasswordHash = await bcrypt.hash(newPassword, 10);
      console.log("New password hash: ", newPasswordHash);

      return res
        .status(200)
        .json({ success: true, message: "Password reset successful" });
    } catch (error) {
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  async changePassword(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array() });
      }
      const { email, oldPassword, newPassword } = req.body;
      console.log("Email: ", email);
      console.log("Old password: ", oldPassword);
      console.log("New password: ", newPassword);
      return res
        .status(200)
        .json({ success: true, message: "Password change successful" });
    } catch (error) {
      return res.status(500).json({ error: "Internal server error" });
    }
  }
}

module.exports = new AuthService();
