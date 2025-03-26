const defaultRouter = require("./default");
const authRouter = require("./auth");

const route = (app) => {
  app.use("/auth", authRouter);
  app.use("/", defaultRouter);
};

module.exports = route;
