const express = require("express");
const { log } = require("../db");
const {
  listKnowledgeFiles,
  saveKnowledgeFile,
  deleteKnowledgeFile,
  searchKnowledge,
} = require("../core/knowledge");

const router = express.Router();

router.get("/", (req, res) => {
  res.json(listKnowledgeFiles());
});

router.post("/upload", (req, res, next) => {
  try {
    const file = saveKnowledgeFile(req.body?.filename, req.body?.content);

    log("info", "knowledge", "上传知识库文件", {
      filename: file.filename,
      size: file.size,
    });

    return res.status(201).json(file);
  } catch (error) {
    return next(error);
  }
});

router.delete("/:filename", (req, res, next) => {
  try {
    const result = deleteKnowledgeFile(req.params.filename);
    log("info", "knowledge", "删除知识库文件", { filename: result.filename });
    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
});

router.post("/search", (req, res, next) => {
  const query = String(req.body?.query || "").trim();

  try {
    const results = searchKnowledge(query);
    log("info", "knowledge", "检索知识库", {
      query,
      result_count: results.length,
    });

    return res.json({ results });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
