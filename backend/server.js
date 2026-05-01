const express = require("express");
const cors = require("cors");
const config = require("./config");
const { log } = require("./db");
const promptsRouter = require("./routes/prompts");
const generateRouter = require("./routes/generate");
const modelsRouter = require("./routes/models");
const searchRouter = require("./routes/search");

const app = express();

app.use(
  cors({
    origin: config.corsOrigin,
  })
);
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.use("/api/prompts", promptsRouter);
app.use("/api/generate", generateRouter);
app.use("/api/models", modelsRouter);
app.use("/api/search", searchRouter);

app.use((req, res) => {
  res.status(404).json({ message: "接口不存在" });
});

app.use((error, req, res, next) => {
  const statusCode = error.statusCode || 500;
  log("error", "server", error.message, {
    path: req.path,
    statusCode,
  });
  res.status(statusCode).json({
    message: error.message || "服务器内部错误",
  });
});

app.listen(config.port, () => {
  log("info", "server", "Backend started", { port: config.port });
  console.log(`Prompt Hub backend listening on http://localhost:${config.port}`);
});
