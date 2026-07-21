import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} from "discord.js";
import { audioAttachment } from "./audio.js";

function safeName(text) {
  return String(text ?? "")
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function displayNumber(index) {
  return String(index + 1).padStart(2, "0");
}

function vocabularyAudioFiles(words) {
  return words.flatMap((word, index) => {
    const number = displayNumber(index);

    return [
    audioAttachment(
      word.audio?.word,
      `${number} - ${safeName(word.german)}.mp3`
    ),
    audioAttachment(
      word.audio?.example,
      `${number} - ${safeName(word.example).replace(/\.$/, "")}.mp3`
    )
    ];
  }).filter(Boolean);
}

export function buildVocabularyMessage(words) {
  const description = words
    .map((word, index) => {
      return [
        `**${index + 1}. ${word.german}** — ${word.english}`,
        `*${word.example}*`,
        `↳ ${word.exampleEnglish}`
      ].filter(Boolean).join("\n");
    })
    .join("\n\n");

  const embed = new EmbedBuilder()
    .setTitle("🇩🇪 German Words of the Day")
    .setDescription(description)
    .setFooter({ text: "A quiz covering these words will appear later today." })
    .setTimestamp();

  const files = vocabularyAudioFiles(words);
  return files.length ? { embeds: [embed], files } : { embeds: [embed] };
}

export function buildQuizMessages(questions, quizId) {
  const intro = {
    embeds: [
      new EmbedBuilder()
        .setTitle("🧠 German Review Time")
        .setDescription(
          `Choose the English meaning of each German word. Use the audio player or pronunciation link to listen first.\n\nThere ${questions.length === 1 ? "is" : "are"} **${questions.length}** question${questions.length === 1 ? "" : "s"}.`
        )
        .setTimestamp()
    ]
  };

  const questionMessages = questions.map((question, index) => {
    const row = new ActionRowBuilder();

    for (const [optionIndex, option] of question.options.entries()) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(
            `vocab:${quizId}:${question.questionIndex}:${optionIndex}:${option.correct ? 1 : 0}`
          )
          .setLabel(option.label)
          .setStyle(ButtonStyle.Secondary)
      );
    }

    const audioFile = audioAttachment(
      question.audio?.word,
      `${displayNumber(index)} - ${safeName(question.german)}.mp3`
    );

    const message = {
      content: `**${index + 1}. What does “${question.german}” mean?**`,
      components: [row]
    };

    if (audioFile) {
      message.files = [audioFile];
    }

    return message;
  });

  const spaced=[];
  questionMessages.forEach((m)=>{
    spaced.push({ content: "‎" });
    spaced.push(m);
  });

  return [intro, ...spaced];
}
