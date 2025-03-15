require("dotenv").config();

const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const route = require("./routes");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");

const PORT = process.env.PORT || 8080;

const options = {
  definition: {
    openapi: "3.1.0",
    info: {
      title: "API Documentation",
      version: "0.1.0",
      description: "This is a sample API documentation",
      license: {
        name: "MIT",
        url: "https://spdx.org/licenses/MIT.html",
      },
    },
    servers: [
      {
        url: "http://localhost:8080",
      },
    ],
  },
  apis: ["./routes/*.js"],
};
const specs = swaggerJsdoc(options);

app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(specs, { explorer: true })
);

app.use(bodyParser.urlencoded({ extended: true }));

// Parses the text as json
app.use(bodyParser.json());

route(app);

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
