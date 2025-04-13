const defaultRouter = require("./default");
const authRouter = require("./auth");
const chatRoomRouter = require("./chatRoom");

const route = (app) => {
  app.use("/auth", authRouter);
  app.use("/", defaultRouter);
  app.use("/chatRoom", chatRoomRouter);
};

module.exports = route;
