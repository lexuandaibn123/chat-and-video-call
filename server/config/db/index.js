const mongoose = require("mongoose");

async function connect() {
  try {
    await mongoose.connect(process.env.DATABASE_URL);
    console.log("Connect DB is OK");
  } catch (error) {
    console.log("Connect fail");
  }
}

module.exports = { connect };