const route = (app ) => {
    app.get("/hello-world", (req, res) => {
        res.json({ message: "Hello World" });
    })
}

module.exports = route;
