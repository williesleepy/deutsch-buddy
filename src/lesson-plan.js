import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const lessonPlanPath = path.join(
  currentDirectory,
  "..",
  "data",
  "lesson-plan.json"
);

let cachedPlan;

export async function loadLessonPlan() {
  if (!cachedPlan) {
    cachedPlan = JSON.parse(await fs.readFile(lessonPlanPath, "utf8"));

    if (!cachedPlan?.days || Object.keys(cachedPlan.days).length !== 366) {
      throw new Error(
        "data/lesson-plan.json must contain all 366 month-day entries."
      );
    }
  }

  return cachedPlan;
}

export async function getLessonForDate(dateTime) {
  const plan = await loadLessonPlan();
  const calendarKey = dateTime.toFormat("MM-dd");
  const lesson = plan.days[calendarKey];

  if (!lesson) {
    throw new Error(`No precomputed lesson exists for ${calendarKey}.`);
  }

  return { calendarKey, lesson };
}
