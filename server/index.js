require("dotenv").config();

const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const route = require("./routes");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");
const cors = require("cors");
const db = require("./config/db");
const session = require("express-session");

const PORT = process.env.PORT || 8080;

const serverUrl = process.env.SERVER_URL;

const clientUrl = process.env.CLIENT_URL;

db.connect();

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
        url: serverUrl,
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

app.use(
  cors({
    origin: clientUrl,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

/* Session */
app.use(
  session({
    secret: "anysecret",
    saveUninitialized: true,
    resave: true,
  })
);

app.use(bodyParser.urlencoded({ extended: true }));

// Parses the text as json
app.use(bodyParser.json());

route(app);

app.listen(PORT, () => {
  console.log(`Server is running at ${serverUrl}`);
});

// -----File index cua chinh-----

// const express = require("express");
// const cors = require("cors");
// const mongoose = require("mongoose");
// const userRoute = require("./Routes/userRoute");
// const chatRoute = require("./Routes/chatRoute");
// const messageRoute = require("./Routes/messageRoute");

// const app = express();
// require("dotenv").config();

// app.use(express.json());
// app.use(cors());
// app.use("/api/users", userRoute);
// app.use("/api/chats", chatRoute);
// app.use("/api/messages", messageRoute);

// app.get("/", (req, res) => {
//   res.send("Welcome");
// });

// const port = process.env.PORT || 5000;
// const uri = process.env.ATLAS_URI;

// app.listen(port, () => {
//   console.log(`Server running on port: ${port}`);
// });

// mongoose
//   .connect(uri)
//   .then(() => console.log("MongoDB Connection established"))
//   .catch((error) => console.log("MongoDB Connection failed:", error.message));
