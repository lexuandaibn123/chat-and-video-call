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
const { createServer } = require("http");
const { Server } = require("socket.io");
const path = require("path");
const ConversationService = require("./services/conversation");
const { instrument } = require("@socket.io/admin-ui");
const { request } = require("http");

const PORT = process.env.PORT || 8080;

const serverUrl = process.env.SERVER_URL;

const clientUrl = process.env.CLIENT_URL;

const authSecret = process.env.AUTH_SECRET;

const nodeEnv = process.env.NODE_ENV;

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
  apis: ["./routes/*.js", "./models/*.js"],
};
const specs = swaggerJsdoc(options);

app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(specs, { explorer: true })
);

app.use(
  cors({
    origin: [clientUrl, "http://localhost:3000"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

/* Session */
const sessionMiddleware = session({
  secret: authSecret,
  saveUninitialized: true,
  resave: true,
  cookie: {
    secure: false,
  },
});
app.use(sessionMiddleware);

app.use(bodyParser.urlencoded({ extended: true }));

// Parses the text as json
app.use(bodyParser.json());

// Setup test
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");

app.get("/", (req, res) => {
  res.render("index.ejs");
});

app.get("/admin-socket", (req, res) => {
  res.render("admin.socket.ejs");
});

route(app);

// ----------------------------------deploy----------------------------------

const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: [clientUrl, "http://localhost:3000"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  },
  withCredentials: true,
});

io.engine.use(sessionMiddleware);

instrument(io, {
  auth: false,
  mode: nodeEnv,
});

io.on("connection", (client) => {
  const session = client.request.session;

  if (!session || !session.userInfo) {
    client.emit("unauthorized");
    console.error("Unauthorized client attempted to connect");
    client.disconnect();
    return;
  }

  const userInfo = session.userInfo;

  client.on("setup", async ({ page = 1, limit = 30 }) => {
    try {
      client.join(userInfo.id);

      const conversations = await ConversationService.fetchConversationsByWs({
        userId: userInfo.id,
        page,
        limit,
      });
      conversations.forEach((conversation) => {
        const userObj = conversation.members.find((member) => {
          return (
            (typeof member.id == "object"
              ? member.id._id.toString() == userInfo.id
              : member.id.toString() == userInfo.id) && member.leftAt == null
          );
        });
        if (userObj && userObj.leftAt == null)
          client.join(conversation._id.toString());
      });
      client.emit("connected");
    } catch (error) {
      console.error(error);
      client.emit("error", error);
    }
  });

  client.on("typing", (roomId) => client.in(roomId).emit("typing"));

  client.on("stopTyping", (roomId) => client.in(roomId).emit("stopTyping"));

  client.on(
    "newMessage",
    async ({ conversationId, data, type, replyToMessageId = null }) => {
      try {
        const message = await ConversationService.createNewMessageByWs({
          userId: userInfo.id,
          conversationId,
          data,
          type,
          replyToMessageId,
        });
        client.in(conversationId).emit("receiveMessage", message);
      } catch (error) {
        console.error(error);
        client.emit("error", error);
      }
    }
  );

  client.on("disconnect", () => {
    console.log(`Client disconnected: ${client.id}`);
  });
});

const adminNamespace = io.of("/admin");

adminNamespace.use((socket, next) => {
  // ensure the user has sufficient rights
  next();
});

adminNamespace.on("connection", (socket) => {
  console.log("Admin connected");

  socket.on("setup", () => {
    socket.emit("connected");
  });

  socket.on("disconnect", () => {
    console.log("Admin disconnected");
  });
});

server.listen(PORT, () => {
  console.log(`Server is running at ${serverUrl}`);
});
