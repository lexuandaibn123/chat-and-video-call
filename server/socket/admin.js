const initAdminNamespace = (adminNamespace) => {
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
};

module.exports = initAdminNamespace;
