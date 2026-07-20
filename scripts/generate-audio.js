import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { EdgeTTS } from "edge-tts-universal";
import "dotenv/config";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.join(currentDirectory, "..");
const wordsPath = path.join(rootDirectory, "data", "words.json");
const audioDirectory = path.join(rootDirectory, "audio");
const manifestPath = path.join(rootDirectory, "data", "audio-manifest.json");

const VOICE_NAME = process.env.TTS_VOICE_NAME ?? "de-DE-KatjaNeural";
const RATE = process.env.TTS_RATE ?? "-10%";
const VOLUME = process.env.TTS_VOLUME ?? "+0%";
const PITCH = process.env.TTS_PITCH ?? "+0Hz";
const FORCE = process.argv.includes("--force");

function readIntegerArgument(name) {
  const prefix = `--${name}=`;
  const inline = process.argv.find((argument) => argument.startsWith(prefix));
  const separateIndex = process.argv.indexOf(`--${name}`);
  const raw = inline?.slice(prefix.length)
    ?? (separateIndex >= 0 ? process.argv[separateIndex + 1] : undefined);

  if (raw === undefined) return undefined;
  const value = Number.parseInt(raw, 10);
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`--${name} must be a positive integer.`);
  }
  return value;
}

const LIMIT = readIntegerArgument("limit");
const START = readIntegerArgument("start") ?? 1;
const MAX_ATTEMPTS = readIntegerArgument("attempts") ?? 3;

if (!/^[-+]\d+%$/.test(RATE)) {
  throw new Error('TTS_RATE must look like "-10%", "+0%", or "+15%".');
}
if (!/^[-+]\d+%$/.test(VOLUME)) {
  throw new Error('TTS_VOLUME must look like "+0%" or "-10%".');
}
if (!/^[-+]\d+Hz$/.test(PITCH)) {
  throw new Error('TTS_PITCH must look like "+0Hz" or "-5Hz".');
}

async function fileExists(filePath) {
  try {
    const stats = await fs.stat(filePath);
    return stats.isFile() && stats.size > 0;
  } catch {
    return false;
  }
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function synthesize(text) {
  const tts = new EdgeTTS(text, VOICE_NAME, {
    rate: RATE,
    volume: VOLUME,
    pitch: PITCH
  });
  const result = await tts.synthesize();
  const audio = Buffer.from(await result.audio.arrayBuffer());

  if (audio.length === 0) {
    throw new Error("Edge TTS returned an empty audio file.");
  }

  return audio;
}

async function synthesizeWithRetry(text, label) {
  let lastError;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return await synthesize(text);
    } catch (error) {
      lastError = error;
      if (attempt < MAX_ATTEMPTS) {
        const waitMilliseconds = attempt * 1500;
        console.warn(`  ${label}: attempt ${attempt} failed; retrying...`);
        await delay(waitMilliseconds);
      }
    }
  }

  throw lastError;
}

async function generateClip(text, relativePath, label) {
  const outputPath = path.join(audioDirectory, relativePath);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  if (!FORCE && await fileExists(outputPath)) {
    return "skipped";
  }

  const temporaryPath = `${outputPath}.tmp`;
  try {
    const audio = await synthesizeWithRetry(text, label);
    await fs.writeFile(temporaryPath, audio);
    await fs.rename(temporaryPath, outputPath);
    return "generated";
  } finally {
    await fs.rm(temporaryPath, { force: true });
  }
}

const allWords = JSON.parse(await fs.readFile(wordsPath, "utf8"));
const selectedWords = allWords.slice(START - 1, LIMIT ? START - 1 + LIMIT : undefined);

if (selectedWords.length === 0) {
  throw new Error("No vocabulary entries matched the requested --start/--limit range.");
}

const stats = { generated: 0, skipped: 0, failed: 0 };
const files = {};

console.log(`Generating ${selectedWords.length * 2} clips for ${selectedWords.length} entries.`);
console.log(`Voice: ${VOICE_NAME} | Rate: ${RATE} | Volume: ${VOLUME} | Pitch: ${PITCH}`);

for (const [index, word] of selectedWords.entries()) {
  const position = START + index;
  const prefix = `[${position}/${allWords.length}] ${word.id} ${word.german}`;

  try {
    const wordResult = await generateClip(word.german, word.audio.word, `${word.id} word`);
    stats[wordResult] += 1;

    const exampleResult = await generateClip(
      word.example,
      word.audio.example,
      `${word.id} example`
    );
    stats[exampleResult] += 1;

    files[word.id] = { ...word.audio };
    console.log(`${prefix}: word ${wordResult}; example ${exampleResult}`);
  } catch (error) {
    stats.failed += 1;
    console.error(`${prefix}: FAILED — ${error?.message ?? error}`);
  }
}

const manifest = {
  version: 1,
  provider: "Microsoft Edge Text-to-Speech",
  package: "edge-tts-universal",
  voiceName: VOICE_NAME,
  rate: RATE,
  volume: VOLUME,
  pitch: PITCH,
  generatedAt: new Date().toISOString(),
  vocabularyEntriesInDictionary: allWords.length,
  vocabularyEntriesProcessed: selectedWords.length,
  expectedAudioFilesInFullLibrary: allWords.length * 2,
  stats,
  files
};

await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(`Done: ${stats.generated} generated, ${stats.skipped} skipped, ${stats.failed} failed.`);

if (stats.failed > 0) {
  process.exitCode = 1;
}
