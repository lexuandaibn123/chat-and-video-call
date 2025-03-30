const { validationResult } = require("express-validator"); // For validation
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const UserRepository = require("../repositories/user");
const { sendMail } = require("../config/nodemailer");

const clientUrl = process.env.CLIENT_URL;

class AuthService {
  async login(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array() });
      }
      const { email, password } = req.body;

      const user = await UserRepository.findByEmail(email);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: "Password incorrect" });
      }

      req.session.userInfo = user;

      if (!user.emailVerified)
        return res.status(401).json({ error: "Email not verified" });

      return res
        .status(200)
        .json({ success: true, message: "Login successful" });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  async register(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array() });
      }
      const { email, password, fullName } = req.body;

      const hashedPassword = await bcrypt.hash(password, 10);
      const verificationToken = crypto.randomBytes(20).toString("hex");

      const user = await UserRepository.create({
        fullName,
        email,
        password: hashedPassword,
        verificationToken,
      });

      const verificationUrl = `${clientUrl}/auth/verify-email?token=${verificationToken}`;

      const message = {
        to: email,
        subject: "Email Verification",
        html: `<p>Click <a href="${verificationUrl}">here</a> to verify your email.</p>`,
      };

      req.session.userInfo = user;

      await sendMail(message);

      return res
        .status(200)
        .json({ success: true, message: "Registration successful" });
    } catch (error) {
      console.error(error);
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
      const user = await UserRepository.findByVerificationToken(token);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      await UserRepository.updateById(user._id, { emailVerified: true });

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

      const user = await UserRepository.findByEmail(email);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (user.emailVerified) {
        return res.status(400).json({ error: "Email already verified" });
      }

      const verificationToken = user.verificationToken;

      const verificationUrl = `${clientUrl}/auth/verify-email?token=${verificationToken}`;

      const message = {
        to: email,
        subject: "Email Verification",
        html: `<p>Click <a href="${verificationUrl}">here</a> to verify your email.</p>`,
      };

      await sendMail(message);

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

      const user = await UserRepository.findByEmail(email);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const resetToken = crypto.randomBytes(20).toString("hex");
      const resetTokenExpiry = Date.now() + 3600000; // 1 hour from now

      await UserRepository.updateById(user._id, {
        resetToken,
        resetTokenExpiry,
      });

      const resetUrl = `${clientUrl}/auth/reset-password?token=${resetToken}`;

      const message = {
        to: email,
        subject: "Password Reset",
        html: `<p>Click <a href="${resetUrl}">here</a> to reset your password.</p>`,
      };

      await sendMail(message);

      return res
        .status(200)
        .json({ success: true, message: "Password reset successful" });
    } catch (error) {
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  async resetPassword(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array() });
      }
      const { token, password } = req.body;

      const user = await UserRepository.findByResetToken(token);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      await UserRepository.updateById(user._id, {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      });

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

      const user = await UserRepository.findByEmail(email);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const isMatch = await bcrypt.compare(oldPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ error: "Old password is incorrect" });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await UserRepository.updateById(user._id, { password: hashedPassword });
      return res
        .status(200)
        .json({ success: true, message: "Password change successful" });
    } catch (error) {
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  async logout(req, res) {
    try {
      req.session.destroy((err) => {
        if (err) {
          console.log(err);
          return res.status(500).json({ error: "Logout failed" });
        }
        return res.status(200).json({ success: true, message: "Logout successful" }); 
      })
    } catch (error) {
      console.log(error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
}

module.exports = new AuthService();
