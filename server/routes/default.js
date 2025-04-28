const express = require("express");
const route = express.Router();

/**
 * @openapi
 * /api/healthz:
 *   get:
 *     tags:
 *       - Default
 *     summary: Health check endpoint
 *     operationId: healthCheck
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: OK
 *                 code:
 *                   type: integer
 *                   example: 200
 *       404:
 *         description: Not Found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: Not Found
 *                 code:
 *                   type: integer
 *                   example: 404
 */
route.get("/healthz", (req, res) => {
  res.json({ status: "OK" });
});

module.exports = route;
