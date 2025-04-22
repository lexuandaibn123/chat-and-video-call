const defaultRouter = require("./default");
const authRouter = require("./auth");
const conversationRouter = require("./conversation");
const messageRoutes = require("./message");

const route = (app) => {
  app.use("/auth", authRouter);
  app.use("/", defaultRouter);
  app.use("/conversation", conversationRouter);
  app.use("/messages", messageRoutes);
};

module.exports = route;
