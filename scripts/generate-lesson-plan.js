import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.join(currentDirectory, "..");
const wordsPath = path.join(rootDirectory, "data", "words.json");
const planPath = path.join(rootDirectory, "data", "lesson-plan.json");

const WORDS_PER_DAY = 3;
const QUIZ_WORDS = 3;
const WORDS_WINDOW = { start: "09:00", end: "12:00" };
const QUIZ_WINDOW = { start: "17:00", end: "21:00" };
const PLAN_SEED = "german-vocab-calendar-v1";

function hashString(value) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function createRandom(seedText) {
  let state = hashString(seedText) || 1;

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(items, random) {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }

  return copy;
}

function sample(items, count, random) {
  return shuffle(items, random).slice(0, Math.min(count, items.length));
}

function clockToMinutes(clock) {
  const [hour, minute] = clock.split(":").map(Number);
  return hour * 60 + minute;
}

function minutesToClock(minutes) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function randomClock(window, random) {
  const start = clockToMinutes(window.start);
  const end = clockToMinutes(window.end);
  return minutesToClock(start + Math.floor(random() * (end - start)));
}

function allCalendarDays() {
  const days = [];
  const leapYear = 2024;

  for (let month = 1; month <= 12; month += 1) {
    const daysInMonth = new Date(Date.UTC(leapYear, month, 0)).getUTCDate();

    for (let day = 1; day <= daysInMonth; day += 1) {
      days.push(`${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
    }
  }

  return days;
}

function buildQuestions(dailyWords, allWords, random) {
  return sample(dailyWords, QUIZ_WORDS, random).map((word, questionIndex) => {
    const distractors = sample(
      allWords.filter((candidate) => candidate.english !== word.english),
      3,
      random
    );

    const options = shuffle(
      [word, ...distractors].map((option) => ({
        label: option.english,
        correct: option.english === word.english
      })),
      random
    );

    return {
      questionIndex,
      wordId: word.id,
      german: word.german,
      correctEnglish: word.english,
      audio: word.audio,
      options
    };
  });
}

const words = JSON.parse(await fs.readFile(wordsPath, "utf8"));
const days = allCalendarDays();
const plan = {};
let rotation = shuffle(words, createRandom(`${PLAN_SEED}:rotation`));
let cursor = 0;

for (const dayKey of days) {
  const random = createRandom(`${PLAN_SEED}:${dayKey}`);

  if (cursor + WORDS_PER_DAY > rotation.length) {
    const remaining = rotation.slice(cursor);
    rotation = [
      ...remaining,
      ...shuffle(words, createRandom(`${PLAN_SEED}:rotation:${dayKey}`))
    ];
    cursor = 0;
  }

  const dailyWords = rotation.slice(cursor, cursor + WORDS_PER_DAY);
  cursor += WORDS_PER_DAY;

  plan[dayKey] = {
    wordsTime: randomClock(WORDS_WINDOW, random),
    quizTime: randomClock(QUIZ_WINDOW, random),
    words: dailyWords,
    questions: buildQuestions(dailyWords, words, random)
  };
}

await fs.writeFile(
  planPath,
  `${JSON.stringify(
    {
      version: 1,
      calendarType: "month-day",
      repeatsAnnually: true,
      generatedFrom: "data/words.json",
      settings: {
        wordsPerDay: WORDS_PER_DAY,
        quizWords: QUIZ_WORDS,
        wordsWindow: WORDS_WINDOW,
        quizWindow: QUIZ_WINDOW,
        seed: PLAN_SEED
      },
      days: plan
    },
    null,
    2
  )}\n`,
  "utf8"
);

console.log(`Generated ${days.length} calendar-day lessons at ${planPath}.`);
