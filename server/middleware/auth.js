const authMiddleware = async (req, res, next) => {
  try {
    const userInfo = req.session.userInfo;

    if (!userInfo || !userInfo.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = { authMiddleware };
