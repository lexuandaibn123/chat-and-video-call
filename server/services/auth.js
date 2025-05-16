const bcrypt = require("bcrypt");
const crypto = require("crypto");
const UserRepository = require("../repositories/user");
const { sendMail } = require("../config/nodemailer");

const { CLIENT_URL, SERVER_URL, NODE_ENV } = require("../constants");

class AuthService {
  async login(req, res) {
    try {
      const { email, password } = req.body;

      const user = await UserRepository.findByEmail(email);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: "Password incorrect" });
      }

      req.session.userInfo = {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        avatar: user.avatar,
      };

      if (!user.emailVerified)
        return res.status(401).json({ error: "Email not verified" });

      return res
        .status(200)
        .json({ success: true, message: "Login successful", userInfo: req.session.userInfo });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ error: String(error) });
    }
  }

  async register(req, res) {
    try {
      const { email, password, fullName } = req.body;

      const isExistingUser = await UserRepository.findByEmail(email);

      if (isExistingUser) {
        return res.status(400).json({ error: "User already exists" });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const verificationToken = crypto.randomBytes(20).toString("hex");

      await UserRepository.create({
        fullName,
        email,
        password: hashedPassword,
        verificationToken,
      });

      const verificationUrl = `${
        NODE_ENV == "development" ? CLIENT_URL : SERVER_URL
      }/auth/verify-email?token=${verificationToken}`;

      const message = {
        to: email,
        subject: "Email Verification",
        html: `<p>Click <a href="${verificationUrl}">here</a> to verify your email.</p>`,
      };

      await sendMail(message);

      return res
        .status(200)
        .json({ success: true, message: "Registration successful" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: String(error) });
    }
  }

  async verifyEmail(req, res) {
    try {
      const { token } = req.query;

      if (!token) {
        return res.status(400).json({ error: "Invalid token" });
      }
      const user = await UserRepository.findByVerificationToken(token);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      await UserRepository.updateById(user._id, { emailVerified: true });

      req.session.userInfo = {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        avatar: user.avatar,
      };

      return res
        .status(200)
        .json({ success: true, message: "Email verification successful" });
    } catch (error) {
      return res.status(500).json({ error: String(error) });
    }
  }

  async resendVerificationEmail(req, res) {
    try {
      const { email } = req.query;

      const user = await UserRepository.findByEmail(email);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (user.emailVerified) {
        return res.status(400).json({ error: "Email already verified" });
      }

      const verificationToken = user.verificationToken;

      const verificationUrl = `${
        NODE_ENV == "development" ? CLIENT_URL : SERVER_URL
      }/auth/verify-email?token=${verificationToken}`;

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
      return res.status(500).json({ error: String(error) });
    }
  }

  async forgotPassword(req, res) {
    try {
      const { email } = req.query;

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

      const resetUrl = `${
        NODE_ENV == "development" ? CLIENT_URL : SERVER_URL
      }/auth/reset-password?token=${resetToken}`;

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
      return res.status(500).json({ error: String(error) });
    }
  }

  async resetPassword(req, res) {
    try {
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
      return res.status(500).json({ error: String(error) });
    }
  }

  async changePassword(req, res) {
    try {
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
      return res.status(500).json({ error: String(error) });
    }
  }

  async logout(req, res) {
    try {
      req.session.destroy((err) => {
        if (err) {
          console.log(err);
          return res.status(500).json({ error: "Logout failed" });
        }
        return res
          .status(200)
          .json({ success: true, message: "Logout successful" });
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ error: String(error) });
    }
  }

  async info(req, res) {
    try {
      return res
        .status(200)
        .json({ success: true, userInfo: req.session.userInfo });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ error: String(error) });
    }
  }
}

module.exports = new AuthService();
