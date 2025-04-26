const defaultRouter = require("./default");
const authRouter = require("./auth");
const conversationRouter = require("./conversation");

const route = (app) => {
  app.use("/auth", authRouter);
  app.use("/conversation", conversationRouter);
  app.use("/", defaultRouter);
};

module.exports = route;
