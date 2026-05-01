const express = require("express");
const { log } = require("../db");
const { webSearch } = require("../core/tools/web-search");

const router = express.Router();

router.post("/", async (req, res, next) => {
  const query = String(req.body?.query || "").trim();

  if (!query) {
    return res.status(400).json({ message: "query 必填" });
  }

  try {
    const response = await webSearch(query);

    log("info", "search", "执行搜索", {
      query,
      result_count: response.results.length,
    });

    return res.json({
      results: response.results,
    });
  } catch (error) {
    log("error", "search", "搜索失败", {
      query,
      message: error.message,
    });
    return next(error);
  }
});

module.exports = router;
