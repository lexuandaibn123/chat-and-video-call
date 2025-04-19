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
const http = require("http");
const path = require("path");

const socketIO = require("socket.io");

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

// Setup test
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");

app.get("/", (req, res) => {
  res.render("index.ejs");
});

route(app);

const server = http.createServer(app);

const io = socketIO(server, {
  cors: {
    origin: clientUrl,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  },
});

io.sockets.on("connection", (client) => {
  client.on("join", (roomId) => {
    // roomId = userId or groupId
    /* handle before join */
    io.sockets.in(room).emit("join", room);

    client.join(room);

    client.emit("joined", room, socket.id);
  });
  client.on("event", (data) => {
    /* … */
  });
  client.on("disconnect", () => {
    /* … */
  });
});

server.listen(PORT, () => {
  console.log(`Server is running at ${serverUrl}`);
});
