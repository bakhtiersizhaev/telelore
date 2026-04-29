import fs from "node:fs";
import { describe, expect, it } from "vitest";
import fixture from "../test/fixtures/telegram-export.json";
import {
  DEFAULT_OPTIONS,
  convertTelegramExport,
  countWords,
  extractTelegramText,
  type TelegramExport,
} from "./telegram-converter";

const samplePath =
  process.env.TELELORE_SAMPLE_JSON ??
  "C:\\Users\\bahti\\Downloads\\Telegram Desktop\\ChatExport_2026-04-29 (1)\\result.json";

describe("telegram converter", () => {
  it("extracts Telegram mixed text arrays without losing links", () => {
    expect(
      extractTelegramText([
        "A linked fragment: ",
        {
          type: "link",
          text: "https://example.com",
        },
      ]),
    ).toBe("A linked fragment: https://example.com");
  });

  it("builds NotebookLM-ready markdown files with rich Telegram fields", () => {
    const result = convertTelegramExport(fixture as TelegramExport, {
      ...DEFAULT_OPTIONS,
      wordsPerFile: 50_000,
    });

    expect(result.stats.chatName).toBe("Pixel AI Chat");
    expect(result.stats.totalMessages).toBe(5);
    expect(result.stats.includedMessages).toBe(4);
    expect(result.files).toHaveLength(1);
    expect(result.files[0].content).toContain("# Pixel AI Chat - NotebookLM chunk 1/1");
    expect(result.files[0].content).toContain("Forwarded from: Source Channel");
    expect(result.files[0].content).toContain("Poll: Best export format?");
    expect(result.files[0].content).toContain("Reactions: 👍 3");
    expect(result.files[0].content).toContain("Media: voice message, voice.ogg");
  });

  it("respects feature toggles", () => {
    const result = convertTelegramExport(fixture as TelegramExport, {
      ...DEFAULT_OPTIONS,
      includeReactions: false,
      includePolls: false,
      includeForwards: false,
      includeMedia: false,
      includeServiceMessages: true,
    });

    const content = result.files[0].content;
    expect(content).not.toContain("Forwarded from");
    expect(content).not.toContain("Poll:");
    expect(content).not.toContain("Reactions:");
    expect(content).not.toContain("Media:");
    expect(content).toContain("Service: Pixel AI Chat - invite members - Ada, Ben");
  });

  it("splits very large chat text into word-budgeted chunks", () => {
    const bigExport: TelegramExport = {
      name: "Huge Room",
      messages: Array.from({ length: 4 }, (_, index) => ({
        id: index + 1,
        type: "message",
        date: `2026-04-0${index + 1}T10:00:00`,
        from: index % 2 ? "Ben" : "Ada",
        text: Array.from({ length: 2_800 }, (__, wordIndex) => `word${wordIndex}`).join(" "),
      })),
    };

    const result = convertTelegramExport(bigExport, {
      ...DEFAULT_OPTIONS,
      wordsPerFile: 5_000,
    });

    expect(result.files.length).toBeGreaterThan(1);
    expect(result.files.every((file) => file.words <= 5_000 || file.messages === 1)).toBe(true);
  });

  it("counts Cyrillic, Latin, and numeric tokens", () => {
    expect(countWords("Привет NotebookLM 2026, чат-задача")).toBe(4);
  });
});

describe.runIf(fs.existsSync(samplePath))("real Telegram Desktop export fixture", () => {
  it("converts the local April 2026 chat export", () => {
    const raw = fs.readFileSync(samplePath, "utf8");
    const parsed = JSON.parse(raw) as TelegramExport;
    const result = convertTelegramExport(parsed, {
      ...DEFAULT_OPTIONS,
      wordsPerFile: 50_000,
    });

    expect(result.stats.totalMessages).toBeGreaterThan(50_000);
    expect(result.stats.includedMessages).toBeGreaterThan(40_000);
    expect(result.files.length).toBeGreaterThan(0);
    expect(result.files[0].content).toContain("NotebookLM chunk");
  });
});
