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
const { uploadRouter } = require("./utils/uploadthing");
const { createRouteHandler } = require("uploadthing/express");
const {
  PORT,
  SERVER_URL,
  CLIENT_URL,
  AUTH_SECRET,
  NODE_ENV,
  SESSION_RELOAD_INTERVAL,
  UPLOADTHING_TOKEN,
} = require("./constants");

db.connect();

/* Session */
const sessionMiddleware = session({
  secret: AUTH_SECRET,
  saveUninitialized: true,
  resave: true,
  cookie: {
    secure: false,
  },
});
app.use(sessionMiddleware);

// Parses the text as json
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");

route(app);

const options = {
  definition: {
    openapi: "3.1.0",
    info: {
      title: "Chat and Video all API Documentation",
      version: "0.1.0",
      description: "Documentation for Chat and Video all API",
      license: {
        name: "MIT",
        url: "https://spdx.org/licenses/MIT.html",
      },
    },
    servers: [
      {
        url: SERVER_URL,
      },
    ],
  },
  apis: ["./routes/*.js", "./models/*.js"],
};

const specs = swaggerJsdoc(options);

app.use(
  "/api/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(specs, {
    customSiteTitle: "Chat and Video all API Documentation",
    explorer: true,
  })
);

if (NODE_ENV === "development") {
  app.use(
    cors({
      origin: [CLIENT_URL],
      methods: ["GET", "POST", "PUT", "DELETE"],
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "x-uploadthing-version",
        "x-uploadthing-package",
      ],
      credentials: true,
    })
  );
}
app.use(
  "/api/uploadthing",
  createRouteHandler({
    router: uploadRouter,
    config: {
      token: UPLOADTHING_TOKEN,
    },
  })
);

app.get("/api/admin-socket", (req, res) => {
  res.render("admin.socket.ejs");
});

app.get("*", (req, res) => {
  res.sendFile("index.html");
});

const server = createServer(app);

const ioOptions =
  NODE_ENV === "development"
    ? {
        cors: {
          origin: [CLIENT_URL, "https://admin.socket.io"],
          methods: ["GET", "POST", "PUT", "DELETE"],
          allowedHeaders: ["Content-Type", "Authorization"],
          credentials: true,
        },
      }
    : {};

const io = new Server(server, ioOptions);
io.engine.use(sessionMiddleware);

instrument(io, {
  auth: false,
  mode: NODE_ENV,
});

io.on("connection", (client) => {
  const sessionTracker = setInterval(() => {
    client.request.session.reload((err) => {
      if (err) {
        client.conn.close();
      }
    });
  }, SESSION_RELOAD_INTERVAL);
  const session = client.request.session;

  if (!session || !session.userInfo) {
    client.emit("unauthorized");
    console.error("Unauthorized client attempted to connect");
    client.disconnect();
    return;
  }

  console.log("Client connected: " + client.id);

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

  client.on("typing", ({ roomId, memberId }) =>
    client.in(roomId).emit("typing", memberId)
  );

  client.on("stopTyping", ({ roomId, memberId }) =>
    client.in(roomId).emit("stopTyping", memberId)
  );

  client.on(
    "newMessage",
    async ({ conversationId, data, type, replyToMessageId = null }) => {
      try {
        if (typeof conversationId !== "string" || conversationId.length < 1) {
          console.error("Invalid conversationId type");
          client.in(userInfo.id).emit("error", "Invalid conversationId type");
        }
        if (type !== "text" && type !== "file" && type !== "image") {
          console.error("Invalid type");
          client.in(userInfo.id).emit("error", "Invalid type");
        }

        if (Array.isArray(data) && data.length > 0) {
          const isValid = data.reduce((a, b) => a && b.type == "image", true);
          if (!isValid) {
            console.error("Invalid data type");
            client.in(userInfo.id).emit("error", "Invalid data type");
          }
        } else if (typeof data === "object") {
          if (data.type !== "text" && data.type !== "file") {
            console.error("Invalid data type");
            client.in(userInfo.id).emit("error", "Invalid data type");
          }
        } else {
          console.error("Invalid data type");
          client.in(userInfo.id).emit("error", "Invalid data type");
        }

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

  client.on("editMessage", async ({ messageId, newData }) => {
    try {
      if (typeof messageId !== "string" || messageId.length < 1) {
        console.error("Invalid messageId type");
        client.in(userInfo.id).emit("error", "Invalid messageId type");
      }
      if (typeof newData !== "string" || newData.length < 1) {
        console.error("Invalid newData type");
        client.in(userInfo.id).emit("error", "Invalid newData type");
      }

      const updatedMessage = await ConversationService.editMessageByWs({
        userId: userInfo.id,
        messageId,
        data,
      });
      client
        .in(updatedMessage.conversationId)
        .emit("editedMessage", updatedMessage);
    } catch (error) {
      console.error(error);
      client.emit("error", error);
    }
  });

  client.on("deleteMessage", async ({ messageId }) => {
    try {
      if (typeof messageId !== "string" || messageId.length < 1) {
        console.error("Invalid messageId type");
        client.in(userInfo.id).emit("error", "Invalid messageId type");
      }

      const deletedMessage = await ConversationService.deleteMessageByWs({
        userId: userInfo.id,
        messageId,
      });
      client
        .in(deletedMessage.conversationId)
        .emit("deletedMessage", deletedMessage);
    } catch (error) {
      console.error(error);
      client.emit("error", error);
    }
  });

  client.on("disconnect", () => {
    console.log(`Client disconnected: ${client.id}`);
    clearInterval(sessionTracker);
  });
});

const adminNamespace = io.of("/admin");

adminNamespace.use((socket, next) => {
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
  console.log(`Server is running at ${SERVER_URL}`);
});
