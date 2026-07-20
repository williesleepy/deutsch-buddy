import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.join(currentDirectory, "..");
const words = JSON.parse(
  await fs.readFile(path.join(rootDirectory, "data", "words.json"), "utf8")
);

const problems = [];
const ids = new Set();

for (const word of words) {
  if (!word.id || ids.has(word.id)) {
    problems.push(`Missing or duplicate ID: ${word.id ?? "(missing)"}`);
  }
  ids.add(word.id);

  for (const [kind, relativePath] of Object.entries(word.audio ?? {})) {
    const filePath = path.join(rootDirectory, "audio", relativePath);
    try {
      const stats = await fs.stat(filePath);
      if (!stats.isFile() || stats.size === 0) {
        problems.push(`${word.id} ${kind} is empty or not a file: ${relativePath}`);
      }
    } catch {
      problems.push(`${word.id} ${kind} is missing: ${relativePath}`);
    }
  }

  if (!word.audio?.word || !word.audio?.example) {
    problems.push(`${word.id} does not define both audio paths.`);
  }
}

if (problems.length) {
  console.error(`Audio validation failed with ${problems.length} problem(s):`);
  for (const problem of problems) console.error(`- ${problem}`);
  process.exitCode = 1;
} else {
  console.log(`Validated ${words.length * 2} audio files for ${words.length} vocabulary entries.`);
}
