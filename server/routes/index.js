const defaultRouter = require("./default");
const authRouter = require("./auth");
const conversationRouter = require("./conversation");
const express = require("express");
const apiRouter = express.Router();

const route = (app) => {
  // app.use("/auth", authRouter);
  // app.use("/conversation", conversationRouter);
  // app.use("/", defaultRouter);

  apiRouter.use("/auth", authRouter);
  apiRouter.use("/conversation", conversationRouter);
  apiRouter.use("/", defaultRouter);

  app.use("/api", apiRouter);
};

module.exports = route;
