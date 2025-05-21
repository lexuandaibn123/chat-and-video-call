/* eslint-disable no-undef */
require("dotenv").config();

const PORT = process.env.PORT || 3000;

const SERVER_URL = process.env.SERVER_URL.trim();

const CLIENT_URL = process.env.CLIENT_URL.trim();

const AUTH_SECRET = process.env.AUTH_SECRET;

const NODE_ENV = process.env.NODE_ENV;

const SESSION_RELOAD_INTERVAL = 30 * 1000;

const UPLOADTHING_TOKEN = process.env.UPLOADTHING_TOKEN;

const dbService = {
  connectionString: process.env.DATABASE_URL,
  minPoolSize: parseInt(process.env.DB_MIN_POOL_SIZE || "5"),
  maxPoolSize: parseInt(process.env.DB_MAX_POOL_SIZE || "20"),
};

const emailService = {
  username: process.env.SMTP_SERVER_USERNAME,
  password: process.env.SMTP_SERVER_PASSWORD,
  host: process.env.SMTP_SERVER_HOST,
};

module.exports = {
  PORT,
  SERVER_URL,
  CLIENT_URL,
  AUTH_SECRET,
  NODE_ENV,
  SESSION_RELOAD_INTERVAL,
  UPLOADTHING_TOKEN,
  dbService,
  emailService,
};
