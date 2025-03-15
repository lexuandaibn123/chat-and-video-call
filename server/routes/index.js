const defaultRouter = require("./default");

const route = (app) => {
  app.use("/", defaultRouter);
};

module.exports = route;
