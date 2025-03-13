require("dotenv").config();

const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const route = require("./routes");

const PORT = process.env.PORT || 8080;

app.use(bodyParser.urlencoded({ extended: true }));

// Parses the text as json
app.use(bodyParser.json());

route(app);

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});