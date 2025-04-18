const defaultRouter = require("./default");
const authRouter = require("./auth");
const chatRoomRouter = require("./chatRoom");
const messageRoutes = require("./message");

const route = (app) => {
  app.use("/auth", authRouter);
  app.use("/", defaultRouter);
  app.use("/chatRoom", chatRoomRouter);
  app.use("/messages", messageRoutes);
};

module.exports = route;
