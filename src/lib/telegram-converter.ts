export type DateFormat = "ru" | "iso";

export type ConverterOptions = {
  wordsPerFile: number;
  dateFormat: DateFormat;
  includeDateTime: boolean;
  includeAuthor: boolean;
  includeReactions: boolean;
  includePolls: boolean;
  includeForwards: boolean;
  includeMedia: boolean;
  includeServiceMessages: boolean;
};

export type TelegramTextPart =
  | string
  | {
      type?: string;
      text?: string | TelegramTextPart[];
      href?: string;
      url?: string;
      [key: string]: unknown;
    };

export type TelegramMessage = {
  id?: number | string;
  type?: string;
  date?: string;
  date_unixtime?: string;
  edited?: string;
  from?: string;
  from_id?: string;
  actor?: string;
  actor_id?: string;
  author?: string;
  forwarded_from?: string;
  forwarded_from_id?: string;
  saved_from?: string;
  reply_to_message_id?: number | string;
  action?: string;
  title?: string;
  members?: string[];
  text?: string | TelegramTextPart[];
  text_entities?: TelegramTextPart[];
  reactions?: TelegramReaction[];
  poll?: TelegramPoll;
  photo?: string;
  file?: string;
  file_name?: string;
  file_size?: number;
  media_type?: string;
  mime_type?: string;
  duration_seconds?: number;
  width?: number;
  height?: number;
  sticker_emoji?: string;
  via_bot?: string;
  inline_bot_buttons?: unknown[];
  [key: string]: unknown;
};

export type TelegramReaction = {
  type?: string;
  count?: number;
  emoji?: string;
  emoticon?: string;
  [key: string]: unknown;
};

export type TelegramPollAnswer = {
  text?: string | TelegramTextPart[];
  voters?: number;
  chosen?: boolean;
  [key: string]: unknown;
};

export type TelegramPoll = {
  question?: string | TelegramTextPart[];
  closed?: boolean;
  total_voters?: number;
  answers?: TelegramPollAnswer[];
  [key: string]: unknown;
};

export type TelegramExport = {
  name?: string;
  type?: string;
  id?: number | string;
  messages?: TelegramMessage[];
  [key: string]: unknown;
};

export type MarkdownFile = {
  name: string;
  content: string;
  words: number;
  messages: number;
  firstDate?: string;
  lastDate?: string;
};

export type ConversionStats = {
  chatName: string;
  chatType?: string;
  totalMessages: number;
  includedMessages: number;
  skippedMessages: number;
  chunks: number;
  totalWords: number;
  authors: number;
  firstDate?: string;
  lastDate?: string;
};

export type ConversionResult = {
  files: MarkdownFile[];
  stats: ConversionStats;
};

type PreparedMessage = {
  content: string;
  words: number;
  date?: string;
  author?: string;
};

type ChunkDraft = {
  items: PreparedMessage[];
  words: number;
  firstDate?: string;
  lastDate?: string;
};

export const DEFAULT_OPTIONS: ConverterOptions = {
  wordsPerFile: 50_000,
  dateFormat: "ru",
  includeDateTime: true,
  includeAuthor: true,
  includeReactions: true,
  includePolls: true,
  includeForwards: true,
  includeMedia: true,
  includeServiceMessages: false,
};

const WORD_PATTERN = /[\p{L}\p{N}]+(?:[._'’-][\p{L}\p{N}]+)*/gu;
const MAX_WORDS_PER_FILE = 500_000;
const MIN_WORDS_PER_FILE = 5_000;

export function convertTelegramExport(
  data: TelegramExport,
  options: ConverterOptions = DEFAULT_OPTIONS,
): ConversionResult {
  validateTelegramExport(data);

  const normalizedOptions = normalizeOptions(options);
  const chatName = cleanInline(data.name ?? "") || "Telegram chat";
  const authors = new Set<string>();
  const chunks: ChunkDraft[] = [];
  let activeChunk = createChunkDraft();
  let includedMessages = 0;
  let totalWords = 0;
  let firstDate: string | undefined;
  let lastDate: string | undefined;

  for (const message of data.messages ?? []) {
    const prepared = prepareMessage(message, normalizedOptions);

    if (!prepared) {
      continue;
    }

    if (
      activeChunk.items.length > 0 &&
      activeChunk.words + prepared.words > normalizedOptions.wordsPerFile
    ) {
      chunks.push(activeChunk);
      activeChunk = createChunkDraft();
    }

    activeChunk.items.push(prepared);
    activeChunk.words += prepared.words;
    activeChunk.firstDate ??= prepared.date;
    activeChunk.lastDate = prepared.date ?? activeChunk.lastDate;
    firstDate ??= prepared.date;
    lastDate = prepared.date ?? lastDate;
    totalWords += prepared.words;
    includedMessages += 1;

    if (prepared.author) {
      authors.add(prepared.author);
    }
  }

  if (activeChunk.items.length > 0) {
    chunks.push(activeChunk);
  }

  const files = chunks.map((chunk, index) =>
    buildMarkdownFile({
      chatName,
      chatType: data.type,
      chunk,
      chunkIndex: index,
      totalChunks: chunks.length,
      options: normalizedOptions,
    }),
  );

  return {
    files,
    stats: {
      chatName,
      chatType: typeof data.type === "string" ? data.type : undefined,
      totalMessages: data.messages?.length ?? 0,
      includedMessages,
      skippedMessages: (data.messages?.length ?? 0) - includedMessages,
      chunks: files.length,
      totalWords,
      authors: authors.size,
      firstDate,
      lastDate,
    },
  };
}

export function validateTelegramExport(data: unknown): asserts data is TelegramExport {
  if (!data || typeof data !== "object") {
    throw new Error("Файл не похож на Telegram JSON export.");
  }

  const maybeExport = data as TelegramExport;

  if (!Array.isArray(maybeExport.messages)) {
    throw new Error("В JSON не найден массив messages. Нужен result.json из Telegram Desktop.");
  }
}

export function extractTelegramText(
  value: string | TelegramTextPart[] | TelegramTextPart | undefined,
): string {
  if (value === undefined || value === null) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((part) => extractTelegramText(part)).join("");
  }

  if (typeof value === "object") {
    return extractTelegramText(value.text);
  }

  return "";
}

export function countWords(value: string): number {
  return value.match(WORD_PATTERN)?.length ?? 0;
}

export function formatDateTime(value: string | undefined, format: DateFormat): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const year = String(date.getFullYear());
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  const hours = pad2(date.getHours());
  const minutes = pad2(date.getMinutes());

  if (format === "iso") {
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  }

  return `${day}.${month}.${year} ${hours}:${minutes}`;
}

export function makeReadmeText(result: ConversionResult): string {
  const lines = [
    "# TeleLore export",
    "",
    `Chat: ${result.stats.chatName}`,
    `Messages included: ${formatNumber(result.stats.includedMessages)} of ${formatNumber(
      result.stats.totalMessages,
    )}`,
    `Markdown chunks: ${formatNumber(result.stats.chunks)}`,
    `Total words: ${formatNumber(result.stats.totalWords)}`,
    result.stats.firstDate && result.stats.lastDate
      ? `Date range: ${result.stats.firstDate} - ${result.stats.lastDate}`
      : "",
    "",
    "Upload the .md files to Google NotebookLM as sources.",
    "All conversion work was done locally in the browser.",
  ];

  return `${lines.filter(Boolean).join("\n")}\n`;
}

function prepareMessage(
  message: TelegramMessage,
  options: ConverterOptions,
): PreparedMessage | null {
  if (message.type === "service" && !options.includeServiceMessages) {
    return null;
  }

  const date = formatDateTime(message.date, options.dateFormat);
  const author = cleanInline(message.from || message.actor || message.author || "");
  const bodyText = extractTelegramText(message.text).trim();
  const lines: string[] = [];
  const heading = buildMessageHeading(message, options, date, author);

  if (heading) {
    lines.push(heading);
  }

  if (options.includeForwards) {
    const forwardLine = renderForward(message);
    if (forwardLine) {
      lines.push(forwardLine);
    }
  }

  if (message.reply_to_message_id) {
    lines.push(`Reply to message: ${message.reply_to_message_id}`);
  }

  if (bodyText) {
    lines.push(bodyText);
  }

  if (options.includePolls && message.poll) {
    lines.push(renderPoll(message.poll));
  }

  if (options.includeMedia) {
    const mediaLine = renderMedia(message);
    if (mediaLine) {
      lines.push(mediaLine);
    }
  }

  if (options.includeReactions && message.reactions?.length) {
    lines.push(renderReactions(message.reactions));
  }

  if (message.type === "service") {
    const serviceLine = renderServiceMessage(message);
    if (serviceLine) {
      lines.push(serviceLine);
    }
  }

  const content = lines.filter(Boolean).join("\n\n").trim();

  if (!content || content === heading) {
    return null;
  }

  return {
    content,
    words: Math.max(1, countWords(content)),
    date,
    author,
  };
}

function buildMessageHeading(
  message: TelegramMessage,
  options: ConverterOptions,
  date: string,
  author: string,
): string {
  const headingParts: string[] = [];

  if (options.includeDateTime && date) {
    headingParts.push(date);
  }

  if (options.includeAuthor && author) {
    headingParts.push(author);
  }

  if (headingParts.length === 0 && message.id !== undefined) {
    headingParts.push(`message ${message.id}`);
  }

  return headingParts.length > 0 ? `### ${headingParts.join(" - ")}` : "";
}

function renderForward(message: TelegramMessage): string {
  const from = cleanInline(message.forwarded_from || message.saved_from || "");

  if (!from) {
    return "";
  }

  return `Forwarded from: ${from}`;
}

function renderPoll(poll: TelegramPoll): string {
  const question = extractTelegramText(poll.question).trim() || "Untitled poll";
  const answers = poll.answers ?? [];
  const answerLines = answers.map((answer) => {
    const text = extractTelegramText(answer.text).trim() || "Untitled answer";
    const voters =
      typeof answer.voters === "number" ? ` - ${formatNumber(answer.voters)} votes` : "";
    return `- ${text}${voters}`;
  });

  const status = poll.closed ? "closed" : "open";
  const total =
    typeof poll.total_voters === "number"
      ? `, ${formatNumber(poll.total_voters)} total votes`
      : "";

  return [`Poll: ${question} (${status}${total})`, ...answerLines].join("\n");
}

function renderMedia(message: TelegramMessage): string {
  const descriptors: string[] = [];

  if (message.media_type) {
    descriptors.push(message.media_type.replaceAll("_", " "));
  } else if (message.photo) {
    descriptors.push("photo");
  } else if (message.file || message.file_name) {
    descriptors.push("file");
  }

  if (message.file_name) {
    descriptors.push(message.file_name);
  }

  if (message.mime_type) {
    descriptors.push(message.mime_type);
  }

  if (typeof message.duration_seconds === "number") {
    descriptors.push(`${message.duration_seconds}s`);
  }

  if (typeof message.width === "number" && typeof message.height === "number") {
    descriptors.push(`${message.width}x${message.height}`);
  }

  if (typeof message.file_size === "number") {
    descriptors.push(formatBytes(message.file_size));
  }

  if (message.sticker_emoji) {
    descriptors.push(`sticker ${message.sticker_emoji}`);
  }

  return descriptors.length > 0 ? `Media: ${descriptors.join(", ")}` : "";
}

function renderReactions(reactions: TelegramReaction[]): string {
  const compact = reactions
    .map((reaction) => {
      const label = reaction.emoji || reaction.emoticon || reaction.type || "reaction";
      const count = typeof reaction.count === "number" ? reaction.count : 1;
      return `${label} ${formatNumber(count)}`;
    })
    .join(", ");

  return compact ? `Reactions: ${compact}` : "";
}

function renderServiceMessage(message: TelegramMessage): string {
  const actor = cleanInline(message.actor || "");
  const action = humanizeAction(message.action);
  const title = cleanInline(message.title || "");
  const members = Array.isArray(message.members) ? message.members.join(", ") : "";
  const parts = [actor, action, title, members].filter(Boolean);

  return parts.length > 0 ? `Service: ${parts.join(" - ")}` : "";
}

function buildMarkdownFile(input: {
  chatName: string;
  chatType?: unknown;
  chunk: ChunkDraft;
  chunkIndex: number;
  totalChunks: number;
  options: ConverterOptions;
}): MarkdownFile {
  const { chatName, chatType, chunk, chunkIndex, totalChunks, options } = input;
  const number = chunkIndex + 1;
  const contentBody = chunk.items.map((item) => item.content).join("\n\n---\n\n");
  const header = [
    `# ${chatName} - NotebookLM chunk ${number}/${totalChunks}`,
    "",
    `- Source: Telegram Desktop JSON export`,
    typeof chatType === "string" ? `- Chat type: ${chatType}` : null,
    `- Messages in chunk: ${formatNumber(chunk.items.length)}`,
    `- Approx words in chunk: ${formatNumber(chunk.words)}`,
    `- Word budget: ${formatNumber(options.wordsPerFile)}`,
    chunk.firstDate && chunk.lastDate ? `- Date range: ${chunk.firstDate} - ${chunk.lastDate}` : null,
    "- Converter: TeleLore",
    "",
    "---",
    "",
  ]
    .filter((line): line is string => line !== null)
    .join("\n");

  const content = `${header}${contentBody}\n`;

  return {
    name: makeChunkFileName(chatName, number, totalChunks),
    content,
    words: chunk.words,
    messages: chunk.items.length,
    firstDate: chunk.firstDate,
    lastDate: chunk.lastDate,
  };
}

function makeChunkFileName(chatName: string, number: number, total: number): string {
  const width = Math.max(3, String(total).length);
  const slug = slugify(chatName) || "telegram-chat";
  return `${slug}-notebooklm-${String(number).padStart(width, "0")}-of-${String(total).padStart(
    width,
    "0",
  )}.md`;
}

function normalizeOptions(options: ConverterOptions): ConverterOptions {
  return {
    ...DEFAULT_OPTIONS,
    ...options,
    wordsPerFile: Math.min(
      MAX_WORDS_PER_FILE,
      Math.max(MIN_WORDS_PER_FILE, Math.floor(options.wordsPerFile || DEFAULT_OPTIONS.wordsPerFile)),
    ),
  };
}

function createChunkDraft(): ChunkDraft {
  return {
    items: [],
    words: 0,
  };
}

function cleanInline(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function humanizeAction(action: unknown): string {
  if (typeof action !== "string") {
    return "";
  }

  return action.replaceAll("_", " ");
}

function slugify(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}
