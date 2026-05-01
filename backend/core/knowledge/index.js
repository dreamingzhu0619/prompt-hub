const fs = require("fs");
const path = require("path");
const config = require("../../config");

const knowledgeDir = config.paths.knowledgeDir;
const allowedExtensions = new Set([".md", ".txt", ".json"]);

fs.mkdirSync(knowledgeDir, { recursive: true });

function sanitizeFilename(filename) {
  const baseName = path.basename(String(filename || "").trim());
  return baseName.replace(/[^\w.\-\u4e00-\u9fa5]/g, "_");
}

function getFilePath(filename) {
  return path.join(knowledgeDir, filename);
}

function ensureSupportedFile(filename) {
  const extension = path.extname(filename).toLowerCase();
  if (!allowedExtensions.has(extension)) {
    const error = new Error("仅支持 .md、.txt、.json 文件");
    error.statusCode = 400;
    throw error;
  }
}

function readFileStats(filename) {
  const filePath = getFilePath(filename);
  const stats = fs.statSync(filePath);

  return {
    filename,
    size: stats.size,
    uploaded_at: stats.mtime.toISOString(),
  };
}

function listKnowledgeFiles() {
  return fs
    .readdirSync(knowledgeDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && !entry.name.startsWith("."))
    .map((entry) => readFileStats(entry.name))
    .sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime());
}

function parseJsonContent(content) {
  try {
    const parsed = JSON.parse(content);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return content;
  }
}

function readKnowledgeContent(filename) {
  const filePath = getFilePath(filename);
  const raw = fs.readFileSync(filePath, "utf8");
  return path.extname(filename).toLowerCase() === ".json" ? parseJsonContent(raw) : raw;
}

function normalizeQueryTokens(query) {
  return String(query || "")
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function loadSearchableDocuments() {
  return listKnowledgeFiles().map((file) => {
    const content = readKnowledgeContent(file.filename);
    return {
      ...file,
      content,
      normalized: content.toLowerCase(),
    };
  });
}

function scoreDocument(queryTokens, doc) {
  if (queryTokens.length === 0) {
    return 0;
  }

  let matchedCount = 0;
  let totalHits = 0;

  for (const token of queryTokens) {
    const hits = doc.normalized.split(token).length - 1;
    if (hits > 0) {
      matchedCount += 1;
      totalHits += hits;
    }
  }

  if (matchedCount === 0) {
    return 0;
  }

  return matchedCount / queryTokens.length + Math.min(totalHits / 10, 0.5);
}

function buildPreview(content, queryTokens) {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const matchedLine =
    lines.find((line) => queryTokens.some((token) => line.toLowerCase().includes(token))) ||
    lines[0] ||
    "";

  return matchedLine.slice(0, config.knowledge.previewChars);
}

function saveKnowledgeFile(filename, content) {
  const safeFilename = sanitizeFilename(filename);
  const textContent = String(content || "");

  if (!safeFilename || !textContent.trim()) {
    const error = new Error("filename 和 content 必填");
    error.statusCode = 400;
    throw error;
  }

  ensureSupportedFile(safeFilename);

  const size = Buffer.byteLength(textContent, "utf8");
  if (size > config.knowledge.maxUploadBytes) {
    const error = new Error(`文件过大，最大支持 ${config.knowledge.maxUploadBytes} 字节`);
    error.statusCode = 400;
    throw error;
  }

  fs.writeFileSync(getFilePath(safeFilename), textContent, "utf8");
  return readFileStats(safeFilename);
}

function deleteKnowledgeFile(filename) {
  const safeFilename = sanitizeFilename(filename);
  const filePath = getFilePath(safeFilename);

  if (!safeFilename || !fs.existsSync(filePath)) {
    const error = new Error("文件不存在");
    error.statusCode = 404;
    throw error;
  }

  fs.unlinkSync(filePath);
  return { success: true, filename: safeFilename };
}

function searchKnowledge(query) {
  const queryTokens = normalizeQueryTokens(query);

  if (queryTokens.length === 0) {
    const error = new Error("query 必填");
    error.statusCode = 400;
    throw error;
  }

  return loadSearchableDocuments()
    .map((doc) => {
      const score = scoreDocument(queryTokens, doc);
      return {
        file: doc.filename,
        score,
        preview: buildPreview(doc.content, queryTokens),
        content: doc.content.slice(0, config.knowledge.contentChars),
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, config.knowledge.maxResults);
}

module.exports = {
  allowedExtensions,
  sanitizeFilename,
  listKnowledgeFiles,
  saveKnowledgeFile,
  deleteKnowledgeFile,
  searchKnowledge,
};
