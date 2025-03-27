const nodemailer = require("nodemailer");

const SMTP_SERVER_HOST = process.env.SMTP_SERVER_HOST;
const SMTP_SERVER_USERNAME = process.env.SMTP_SERVER_USERNAME;
const SMTP_SERVER_PASSWORD = process.env.SMTP_SERVER_PASSWORD;

const transporter = nodemailer.createTransport({
  service: "gmail",
  host: SMTP_SERVER_HOST,
  port: 587,
  secure: true,
  auth: {
    user: SMTP_SERVER_USERNAME,
    pass: SMTP_SERVER_PASSWORD,
  },
});

const sendMail = async (data) => {
  try {
    const isVerified = await transporter.verify();
    if (!isVerified) {
      console.error("SMTP Server is not working");
      throw new Error("SMTP Server is not working");
    }

    const adminAddress = `LiamLee <${SMTP_SERVER_USERNAME}>`;

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
