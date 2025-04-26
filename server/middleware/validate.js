const { validationResult } = require("express-validator"); // For validation

const validateMiddleware = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array() });
    }
    next();
  } catch (error) {
    console.error("Validation middleware error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = { validateMiddleware };
