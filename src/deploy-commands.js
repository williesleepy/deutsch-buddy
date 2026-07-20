import { PermissionFlagsBits, REST, Routes, SlashCommandBuilder } from "discord.js";
import { config } from "./config.js";

const commands = [
  new SlashCommandBuilder()
    .setName("postwords")
    .setDescription("Post today's German vocabulary now.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  new SlashCommandBuilder()
    .setName("postquiz")
    .setDescription("Post today's German vocabulary quiz now.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
].map((command) => command.toJSON());

const rest = new REST().setToken(config.token);

try {
  await rest.put(
    Routes.applicationGuildCommands(config.clientId, config.guildId),
    { body: commands }
  );

  console.log("Registered guild commands successfully.");
} catch (error) {
  console.error("Failed to register commands:", error);
  process.exitCode = 1;
}
