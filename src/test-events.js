// src/test-events.js

import { Client, GatewayIntentBits } from "discord.js";

import { config } from "./config.js";
import { postQuiz, postWords } from "./scheduler.js";

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const eventToTest = process.argv[2];

client.once("ready", async () => {
  try {
    if (eventToTest === "words") {
      await postWords(client);
      console.log("Posted the vocabulary event.");
    } else if (eventToTest === "quiz") {
      await postQuiz(client);
      console.log("Posted the quiz event.");
    } else {
      throw new Error('Use either "words" or "quiz".');
    }
  } catch (error) {
    console.error("Test failed:", error);
    process.exitCode = 1;
  } finally {
    client.destroy();
  }
});

await client.login(config.token);
