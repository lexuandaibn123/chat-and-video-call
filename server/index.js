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
const ConversationService = require("./services/conversation");
const socketIO = require("socket.io");

const PORT = process.env.PORT || 8080;

const serverUrl = process.env.SERVER_URL;

const clientUrl = process.env.CLIENT_URL;

const authSecret = process.env.AUTH_SECRET;

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
    origin: clientUrl,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

/* Session */
app.use(
  session({
    secret: authSecret,
    saveUninitialized: true,
    resave: true,
    cookie: {
      secure: false,
    },
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

// ----------------------------------deploy----------------------------------

const server = http.createServer(app);

const io = socketIO(server, {
  cors: {
    origin: clientUrl,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  },
});

io.sockets.on("connection", (client) => {
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
        const userObj = conversation.members.find(
          (member) => member.id == userInfo.id
        );
        if (userObj.leftAt == null) client.join(conversation._id.toString());
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

server.listen(PORT, () => {
  console.log(`Server is running at ${serverUrl}`);
});
