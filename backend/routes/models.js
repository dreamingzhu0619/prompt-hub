const express = require("express");
const config = require("../config");

const router = express.Router();

router.get("/", (req, res) => {
  const models = config.llm.models.map((id) => ({
    id,
    name: id,
    provider: config.llm.provider,
    is_default: id === config.llm.defaultModel,
  }));

  res.json(models);
});

module.exports = router;
