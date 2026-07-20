# 🇩🇪 Deutsch Buddy

A deliberately small, stateless Discord bot that posts a German vocabulary lesson and a quiz every day.

## Daily behavior

- `data/lesson-plan.json` contains a precomputed lesson for every calendar day (`01-01` through `12-31`, including `02-29`).
- Every daily lesson contains **3 vocabulary entries** and **3 quiz questions**.
- Each vocabulary entry has a German word or phrase, its English meaning, a German example sentence, an English translation, and stable audio paths.
- The calendar plan repeats annually.
- On startup, the bot schedules only events whose times are still in the future. It does not catch up missed events or write runtime state.

## Requirements

- Node.js 22.12.0 or newer
- A Discord bot
- Optional: a public host for the precomputed MP3 library
- Optional for generation only: a Microsoft Edge Text-to-Speech API key

## Bot setup

1. Create a Discord application and bot in the Discord Developer Portal.
2. Invite it with the `bot` and `applications.commands` scopes.
3. Give it these channel permissions:
   - View Channel
   - Send Messages
   - Embed Links
   - Attach Files
4. Copy `.env.example` to `.env`.
5. Fill in `DISCORD_TOKEN`, `CLIENT_ID`, `GUILD_ID`, and `CHANNEL_ID`.
6. Run `npm install`.
7. Register the test commands with `node src/deploy-commands.js`.
8. Start the bot with `npm start`.

## Audio behavior

The vocabulary database contains relative paths such as:

```json
{
  "id": "0001",
  "german": "der Apfel",
  "audio": {
    "word": "words/0001.mp3",
    "example": "examples/0001.mp3"
  }
}
```

Set the public root directory in Render:

```env
AUDIO_BASE_URL=https://your-host.example/deutsch-buddy/audio
```

The resulting files are expected at URLs such as:

```text
https://your-host.example/deutsch-buddy/audio/words/0001.mp3
https://your-host.example/deutsch-buddy/audio/examples/0001.mp3
```

When `AUDIO_BASE_URL` is configured:

- Each daily lesson includes the word and example-sentence audio for all three entries.
- Each quiz question includes the pronunciation for the German word being tested.
- The embed also contains direct pronunciation links as a fallback.

When `AUDIO_BASE_URL` is blank, the bot continues working normally without audio.

## Precomputing the audio library

The included generator uses Microsoft Edge Text-to-Speech through the `edge-tts-universal` Node package. It does not require an API key, cloud project, or billing account. Optional local `.env` settings are:

```env
TTS_VOICE_NAME=de-DE-KatjaNeural
TTS_RATE=-10%
TTS_VOLUME=+0%
TTS_PITCH=+0Hz
```

Test one entry before generating the entire library:

```bash
npm run generate:audio -- --limit=1
```

Generate all 600 MP3 files:

```bash
npm run generate:audio
```

The command creates:

```text
audio/
├── words/
│   ├── 0001.mp3
│   └── ...
└── examples/
    ├── 0001.mp3
    └── ...
```

Existing files are skipped, making interrupted generation safe to resume. To replace every file after changing the voice or speaking rate:

```bash
npm run generate:audio -- --force
```

The generator also writes `data/audio-manifest.json` with the voice settings, generation date, expected file count, and path mapping.

Validate the completed local library with:

```bash
npm run validate:audio
```

A complete 300-entry database contains:

- 300 word clips
- 300 example-sentence clips
- 600 total MP3 files

The generated MP3 files are ignored by Git by default. Upload the contents of `audio/` to your public host while preserving the `words/` and `examples/` directories.

## Rebuilding the annual lesson plan

After editing `data/words.json`, run:

```bash
npm run generate:plan
```

This regenerates all 366 calendar entries. Current generation settings are:

- 3 words per day
- 3 quiz questions per day
- vocabulary post between 9:00 AM and noon
- quiz post between 5:00 PM and 9:00 PM
- fixed seed for repeatable output

Commit the regenerated `data/lesson-plan.json` with the project.

## Testing posts

Post today's lesson immediately:

```bash
npm run test:words
```

Post today's quiz immediately:

```bash
npm run test:quiz
```

Button feedback remains ephemeral, so only the person answering sees whether their choice was correct.
