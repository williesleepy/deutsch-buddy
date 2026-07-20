# Generate the German pronunciation library

The generator uses Microsoft Edge's online speech service through the
`edge-tts-universal` Node package. It does not require an API key, Microsoft
Cloud account, or billing account.

## 1. Install dependencies

```bash
npm install
```

## 2. Optional voice settings

Copy `.env.example` to `.env`. The defaults are already suitable for the bot:

```env
TTS_VOICE_NAME=de-DE-KatjaNeural
TTS_RATE=-10%
TTS_VOLUME=+0%
TTS_PITCH=+0Hz
```

## 3. Test one vocabulary entry first

```bash
npm run generate:audio -- --limit=1
```

This should create:

```text
audio/words/0001.mp3
audio/examples/0001.mp3
```

Play both files before generating the full library.

## 4. Generate all 600 files

```bash
npm run generate:audio
```

Existing non-empty files are skipped. To replace every existing file:

```bash
npm run generate:audio -- --force
```

Useful recovery options:

```bash
npm run generate:audio -- --start=101
npm run generate:audio -- --start=101 --limit=25
npm run generate:audio -- --attempts=5
```

## 5. Validate the completed library

```bash
npm run validate:audio
```

It should report 600 valid files for 300 vocabulary entries.

## 6. Upload the audio

Upload the contents of `audio/` so the public paths follow this shape:

```text
https://your-host.example/deutsch-buddy/audio/words/0001.mp3
https://your-host.example/deutsch-buddy/audio/examples/0001.mp3
```

Then set this environment variable for the deployed Discord bot:

```env
AUDIO_BASE_URL=https://your-host.example/deutsch-buddy/audio
```

Do not include a trailing slash. The bot also removes one automatically.

## Notes

- Audio generation requires an internet connection because Edge TTS is an
  online service.
- Run one generator process at a time. Sequential generation is intentionally
  used to reduce throttling and transient failures.
- The script retries failed requests, writes through a temporary file, and
  never treats an empty file as successfully generated.
