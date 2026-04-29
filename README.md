# TeleLore

**TeleLore** is a free, open-source Telegram export to NotebookLM converter. It turns a Telegram Desktop `result.json` chat history into clean Markdown (`.md`) chunks that can be uploaded to [Google NotebookLM](https://notebooklm.google/) as sources.

Built for huge Telegram chats, pet-project writeups, research communities, work archives, and any chat history you want to query with NotebookLM.

## Live app

- Production: https://telelore.vercel.app
- Repository: https://github.com/bakhtiersizhaev/telelore

## Related NotebookLM Tools

- [TubeLM Link Picker](https://bakhtiersizhaev.github.io/tubelm-link-picker/) is a Chrome extension for selecting YouTube videos and Shorts, copying clean URLs in bulk, and pasting them into NotebookLM.
- TubeLM repository: [github.com/bakhtiersizhaev/tubelm-link-picker](https://github.com/bakhtiersizhaev/tubelm-link-picker).

## What it does

- Converts Telegram Desktop JSON exports into NotebookLM-ready Markdown files.
- Supports both Telegram JSON shapes: a single chat export with `messages` in the root and a full account export with `chats.list[].messages`.
- Splits large chats by word budget: 50k to 500k words per `.md` file.
- Keeps useful message context: date/time, author, forwards, reactions, polls, and media metadata.
- Runs in a browser Web Worker, so the UI stays responsive while processing big JSON files.
- Creates one ZIP archive with all `.md` chunks plus a small README.
- Does not upload your chat anywhere. Processing is local in the browser.

## Why Markdown for NotebookLM

NotebookLM supports many file types, including `pdf`, `txt`, `md`, `docx`, `csv`, `pptx`, `epub`, images, audio, and video. For Telegram chats, Markdown is the simplest source format: it stays readable, searchable, easy to split, and light enough for large text histories.

## How to export from Telegram

1. Open Telegram Desktop.
2. Open the chat or channel.
3. Choose **Export chat history**.
4. Select **Machine-readable JSON**.
5. Export and use the generated `result.json` in TeleLore.

TeleLore also accepts the larger **Export Telegram data** account archive. In that format, Telegram still calls the file `result.json`, but messages are nested inside `chats.list`.

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Verification

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

To run the real large-export test locally, set a path to a Telegram Desktop `result.json`:

```bash
$env:TELELORE_SAMPLE_JSON="C:\Users\bahti\Downloads\Telegram Desktop\ChatExport_2026-04-29 (1)\result.json"
npm run test
```

## Tech stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- JSZip
- Vitest
- Vercel

## SEO keywords

Telegram export to NotebookLM, Telegram JSON converter, Telegram chat to Markdown, result.json to md, Google NotebookLM sources, Telegram history converter, NotebookLM Markdown chunks.

## License

MIT
