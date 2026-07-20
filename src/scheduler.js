import { DateTime } from "luxon";
import { config } from "./config.js";
import { getLessonForDate } from "./lesson-plan.js";
import { buildQuizMessages, buildVocabularyMessage } from "./messages.js";
import { parseClock } from "./utils.js";

const MAX_TIMEOUT = 2_147_483_647;
let scheduledDate;
let scheduledTimers = [];

function localNow() {
  return DateTime.now().setZone(config.timeZone);
}

function dateTimeForClock(day, clock) {
  const parts = parseClock(clock);
  return day.set({ ...parts, second: 0, millisecond: 0 });
}

function clearScheduledTimers() {
  for (const timer of scheduledTimers) {
    clearTimeout(timer);
  }

  scheduledTimers = [];
}

function scheduleAt(dateTime, callback) {
  const delay = dateTime.toMillis() - Date.now();

  if (delay <= 0) {
    return null;
  }

  if (delay > MAX_TIMEOUT) {
    const timer = setTimeout(() => scheduleAt(dateTime, callback), MAX_TIMEOUT);
    timer.unref?.();
    return timer;
  }

  const timer = setTimeout(callback, delay);
  timer.unref?.();
  return timer;
}

async function getTextChannel(client) {
  const channel = await client.channels.fetch(config.channelId);

  if (!channel?.isTextBased() || !("send" in channel)) {
    throw new Error("CHANNEL_ID does not point to a sendable text channel.");
  }

  return channel;
}

async function getCurrentLesson() {
  const now = localNow();
  const { calendarKey, lesson } = await getLessonForDate(now);

  return {
    date: now.toISODate(),
    calendarKey,
    lesson,
    wordsAt: dateTimeForClock(now.startOf("day"), lesson.wordsTime),
    quizAt: dateTimeForClock(now.startOf("day"), lesson.quizTime)
  };
}

export async function postWords(client) {
  const { lesson } = await getCurrentLesson();
  const channel = await getTextChannel(client);
  await channel.send(buildVocabularyMessage(lesson.words));
  return true;
}

export async function postQuiz(client) {
  const { date, lesson } = await getCurrentLesson();
  const channel = await getTextChannel(client);
  const messages = buildQuizMessages(lesson.questions, date);

  for (const message of messages) {
    await channel.send(message);
  }

  return true;
}

export async function scheduleCurrentDay(client) {
  clearScheduledTimers();

  const current = await getCurrentLesson();
  const now = localNow();
  scheduledDate = current.date;

  // Simple restart behavior: only schedule events that are still in the future.
  if (current.wordsAt > now) {
    const timer = scheduleAt(current.wordsAt, async () => {
      try {
        await postWords(client);
      } catch (error) {
        console.error("Failed to post vocabulary:", error);
      }
    });

    if (timer) scheduledTimers.push(timer);
  }

  if (current.quizAt > now) {
    const timer = scheduleAt(current.quizAt, async () => {
      try {
        await postQuiz(client);
      } catch (error) {
        console.error("Failed to post quiz:", error);
      }
    });

    if (timer) scheduledTimers.push(timer);
  }

  return {
    date: current.date,
    calendarKey: current.calendarKey,
    wordsAt: current.wordsAt.toFormat("h:mm a ZZZZ"),
    quizAt: current.quizAt.toFormat("h:mm a ZZZZ"),
    wordsScheduled: current.wordsAt > now,
    quizScheduled: current.quizAt > now
  };
}

export function startDailyRollover(client) {
  const check = async () => {
    try {
      const today = localNow().toISODate();

      if (scheduledDate !== today) {
        const schedule = await scheduleCurrentDay(client);
        console.log(formatScheduleLog(schedule));
      }
    } catch (error) {
      console.error("Daily rollover check failed:", error);
    }
  };

  const timer = setInterval(check, 60_000);
  timer.unref?.();
}

export function formatScheduleLog(schedule) {
  const wordsStatus = schedule.wordsScheduled ? "scheduled" : "skipped (past)";
  const quizStatus = schedule.quizScheduled ? "scheduled" : "skipped (past)";

  return `Calendar lesson ${schedule.calendarKey} for ${schedule.date}: words at ${schedule.wordsAt} [${wordsStatus}]; quiz at ${schedule.quizAt} [${quizStatus}].`;
}
