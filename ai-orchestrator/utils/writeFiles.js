import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const PROJECT_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  ".."
);

const ALLOWED_PREFIXES = ["frontend/", "backend/", "sql/"];

function normalize(relPath) {
  return String(relPath).replace(/\\/g, "/").replace(/^\.\/+/, "");
}

function validate(relPath) {
  const norm = normalize(relPath);
  if (path.isAbsolute(norm)) {
    throw new Error(`absolute paths not allowed: ${relPath}`);
  }
  if (norm.split("/").includes("..")) {
    throw new Error(`path traversal not allowed: ${relPath}`);
  }
  if (!ALLOWED_PREFIXES.some((p) => norm.startsWith(p))) {
    throw new Error(
      `path must start with one of: ${ALLOWED_PREFIXES.join(", ")}`
    );
  }
  return norm;
}

export function writeProjectFiles(files) {
  if (!Array.isArray(files) || files.length === 0) return [];

  const manifest = [];

  for (const file of files) {
    if (
      !file ||
      typeof file !== "object" ||
      !file.path ||
      typeof file.content !== "string"
    ) {
      manifest.push({
        path: file?.path ?? "(invalid)",
        status: "skipped",
        reason: "invalid entry — need { path, content }",
      });
      continue;
    }

    let norm;
    try {
      norm = validate(file.path);
    } catch (err) {
      manifest.push({ path: file.path, status: "skipped", reason: err.message });
      continue;
    }

    const target = path.resolve(PROJECT_ROOT, norm);
    const existed = fs.existsSync(target);

    try {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, file.content, "utf-8");
      manifest.push({
        path: norm,
        target,
        agent: file.agent,
        status: existed ? "modified" : "created",
      });
    } catch (err) {
      manifest.push({ path: norm, status: "failed", reason: err.message });
    }
  }

  return manifest;
}
