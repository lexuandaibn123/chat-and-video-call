const mongoose = require("mongoose");
const { dbService } = require("../../constants");
async function connect() {
  try {
    await mongoose.connect(dbService.connectionString, {
      minPoolSize: dbService.minPoolSize,
      maxPoolSize: dbService.maxPoolSize,
      connectTimeoutMS: 60000,
      socketTimeoutMS: 45000,
    });
    console.log("Connect DB is OK");
  } catch (error) {
    console.log("Connect fail", error.message);
  }
}

module.exports = { connect };
