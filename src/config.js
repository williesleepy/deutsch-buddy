import "dotenv/config";

const required = ["DISCORD_TOKEN", "CLIENT_ID", "GUILD_ID", "CHANNEL_ID"];

for (const name of required) {
  if (!process.env[name]) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
}

function positiveInteger(name, fallback) {
  const value = Number.parseInt(process.env[name] ?? String(fallback), 10);

  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return value;
}

export const config = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,
  channelId: process.env.CHANNEL_ID,
  timeZone: process.env.TIME_ZONE ?? "America/Chicago",
  wordsWindowStart: process.env.WORDS_WINDOW_START ?? "09:00",
  wordsWindowEnd: process.env.WORDS_WINDOW_END ?? "12:00",
  quizWindowStart: process.env.QUIZ_WINDOW_START ?? "17:00",
  quizWindowEnd: process.env.QUIZ_WINDOW_END ?? "21:00",
  audioBaseUrl: process.env.AUDIO_BASE_URL?.replace(/\/+$/, "") || null,
  wordsPerDay: positiveInteger("WORDS_PER_DAY", 3),
  quizWords: positiveInteger("QUIZ_WORDS", 3)
};
