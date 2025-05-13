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
const { instrument } = require("@socket.io/admin-ui");
const { uploadRouter } = require("./utils/uploadthing");
const { createRouteHandler } = require("uploadthing/express");
const {
  PORT,
  SERVER_URL,
  CLIENT_URL,
  AUTH_SECRET,
  NODE_ENV,
  UPLOADTHING_TOKEN,
} = require("./constants");
const initDefaultNameSpace = require("./socket/default");
const initVideoCallNamespace = require("./socket/video");
const initAdminNamespace = require("./socket/admin");

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
const allowedOrigins = [
  CLIENT_URL,
  "http://localhost:8080",
  "http://localhost:3000",
  "https://admin.socket.io",
  "https://9c09-2405-4802-17cb-99b0-653c-5503-c01f-cf8.ngrok-free.app",
];
if (NODE_ENV === "development") {
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, origin);
        } else {
          console.error("Not allowed by CORS: " + origin);
          callback(new Error("Not allowed by CORS"));
        }
      },
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

route(app);

if (NODE_ENV === "production") {
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
  });
}

const server = createServer(app);

const ioOptions =
  NODE_ENV === "development"
    ? {
        cors: {
          origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
              callback(null, origin);
            } else {
              callback(new Error("Not allowed by CORS"));
            }
          },
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

// Default namespace

const defaultNamespace = io.of("/");

initDefaultNameSpace(defaultNamespace);

// Video call namespace

const videoCallNamespace = io.of("/video-call");

initVideoCallNamespace(videoCallNamespace, defaultNamespace);

// Admin namespace

const adminNamespace = io.of("/admin");

initAdminNamespace(adminNamespace);

server.listen(PORT, () => {
  console.log(`Server is running at ${SERVER_URL}`);
});
