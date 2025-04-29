const nodemon = require("nodemon");
const ngrok = require("ngrok");
const { PORT } = require("./constants");

nodemon({
  script: "index.js",
  ext: "js json",
});

let url = null;

nodemon
  .on("start", async () => {
    if (!url) {
      url = await ngrok.connect({ port: PORT });
      console.log(`Server now available at ${url}`);
    }
  })
  .on("quit", async () => {
    await ngrok.kill();
  });
