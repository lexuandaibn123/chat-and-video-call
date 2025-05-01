const nodemailer = require("nodemailer");

const { emailService } = require("../../constants");

const transporter = nodemailer.createTransport({
  service: "gmail",
  host: emailService.host,
  port: 587,
  secure: true,
  auth: {
    user: emailService.username,
    pass: emailService.password,
  },
});

const sendMail = async (data) => {
  try {
    const isVerified = await transporter.verify();
    if (!isVerified) {
      console.error("SMTP Server is not working");
      throw new Error("SMTP Server is not working");
    }

    const adminAddress = `LiamLee <${emailService.username}>`;

    const message = {
      from: adminAddress,
      to: data.to,
      subject: data.subject,
      html: data.html,
    };

    const info = await transporter.sendMail(message);

    console.log("Message sent: ", info.messageId);
  } catch (error) {
    console.error(error);
  }
};

module.exports = { sendMail };
