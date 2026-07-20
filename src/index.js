import {
  Client,
  Events,
  GatewayIntentBits,
  MessageFlags
} from "discord.js";
import { config } from "./config.js";
import {
  formatScheduleLog,
  postQuiz,
  postWords,
  scheduleCurrentDay,
  startDailyRollover
} from "./scheduler.js";

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}.`);

  try {
    const schedule = await scheduleCurrentDay(readyClient);

    console.log(formatScheduleLog(schedule));

    startDailyRollover(readyClient);
  } catch (error) {
    console.error("Could not initialize the daily schedule:", error);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === "postwords") {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        await postWords(client, { force: true });
        await interaction.editReply("Posted the vocabulary event.");
        return;
      }

      if (interaction.commandName === "postquiz") {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        await postQuiz(client, { force: true });
        await interaction.editReply("Posted the quiz event.");
        return;
      }
    }

    if (interaction.isButton() && interaction.customId.startsWith("vocab:")) {
      const parts = interaction.customId.split(":");
      const isCorrect = parts.at(-1) === "1";

      await interaction.reply({
        content: isCorrect
          ? "✅ Correct!"
          : "❌ Not quite—try another answer.",
        flags: MessageFlags.Ephemeral
      });
    }
  } catch (error) {
    console.error("Interaction failed:", error);

    const response = {
      content: "Something went wrong while handling that interaction.",
      flags: MessageFlags.Ephemeral
    };

    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(response).catch(() => {});
    } else {
      await interaction.reply(response).catch(() => {});
    }
  }
});

process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error);
});

await client.login(config.token);
