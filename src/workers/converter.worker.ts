import JSZip from "jszip";
import {
  convertTelegramExport,
  makeReadmeText,
  type ConversionResult,
  type ConverterOptions,
  type TelegramExport,
} from "@/lib/telegram-converter";

export type WorkerRequest = {
  type: "convert";
  file: File;
  options: ConverterOptions;
};

export type WorkerProgress = {
  type: "progress";
  stage: "reading" | "parsing" | "converting" | "zipping";
  progress: number;
  label: string;
};

export type WorkerComplete = {
  type: "complete";
  zipBlob: Blob;
  result: SerializableResult;
};

export type WorkerFailure = {
  type: "error";
  message: string;
};

export type WorkerResponse = WorkerProgress | WorkerComplete | WorkerFailure;

export type SerializableResult = {
  stats: ConversionResult["stats"];
  files: Array<{
    name: string;
    words: number;
    messages: number;
    bytes: number;
    firstDate?: string;
    lastDate?: string;
    preview?: string;
  }>;
};

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  if (event.data.type !== "convert") {
    return;
  }

  try {
    postProgress("reading", 5, "Читаю JSON файл");
    const rawText = await event.data.file.text();

    postProgress("parsing", 20, "Разбираю Telegram export");
    const parsed = JSON.parse(rawText) as TelegramExport;

    postProgress("converting", 45, "Собираю Markdown чанки");
    const result = convertTelegramExport(parsed, event.data.options);

    postProgress("zipping", 70, "Упаковываю .md файлы");
    const zip = new JSZip();

    for (const file of result.files) {
      zip.file(file.name, file.content);
    }

    zip.file("README.txt", makeReadmeText(result));

    const zipBlob = await zip.generateAsync(
      {
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: {
          level: 6,
        },
      },
      (metadata) => {
        postProgress("zipping", 70 + Math.round(metadata.percent * 0.28), "Сжимаю архив");
      },
    );

    const serializable: SerializableResult = {
      stats: result.stats,
      files: result.files.map((file, index) => ({
        name: file.name,
        words: file.words,
        messages: file.messages,
        bytes: new Blob([file.content]).size,
        firstDate: file.firstDate,
        lastDate: file.lastDate,
        preview: index === 0 ? file.content.split("\n").slice(0, 32).join("\n") : undefined,
      })),
    };

    postMessage({
      type: "complete",
      zipBlob,
      result: serializable,
    } satisfies WorkerComplete);
  } catch (error) {
    postMessage({
      type: "error",
      message: error instanceof Error ? error.message : "Не удалось конвертировать файл.",
    } satisfies WorkerFailure);
  }
};

function postProgress(
  stage: WorkerProgress["stage"],
  progress: number,
  label: string,
): void {
  postMessage({
    type: "progress",
    stage,
    progress: Math.min(100, Math.max(0, progress)),
    label,
  } satisfies WorkerProgress);
}
