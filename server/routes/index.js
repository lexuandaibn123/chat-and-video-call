const defaultRouter = require("./default");
const authRouter = require("./auth");
const ConversationRouter = require("./conversation");
const messageRoutes = require("./message");

const route = (app) => {
  app.use("/auth", authRouter);
  app.use("/", defaultRouter);
  app.use("/conversation", ConversationRouter);
  app.use("/messages", messageRoutes);
};

module.exports = route;
