"use client";

import type { ChangeEvent, DragEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  CheckCircle2,
  Download,
  FileJson,
  GitBranch,
  Loader2,
  NotebookText,
  RotateCcw,
  Settings2,
  ShieldCheck,
  UploadCloud,
  Zap,
} from "lucide-react";
import {
  DEFAULT_OPTIONS,
  type ConverterOptions,
  type DateFormat,
} from "@/lib/telegram-converter";
import type { SerializableResult, WorkerResponse } from "@/workers/converter.worker";

const WORD_OPTIONS = [
  50_000,
  100_000,
  150_000,
  200_000,
  250_000,
  300_000,
  350_000,
  400_000,
  450_000,
  500_000,
];

type ProgressState = {
  progress: number;
  label: string;
};

export function ConverterApp() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [options, setOptions] = useState<ConverterOptions>(DEFAULT_OPTIONS);
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [result, setResult] = useState<SerializableResult | null>(null);
  const [zipUrl, setZipUrl] = useState<string | null>(null);
  const [zipName, setZipName] = useState("telelore-notebooklm.zip");
  const [error, setError] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const zipUrlRef = useRef<string | null>(null);

  const isConverting = progress !== null;
  const canConvert = file !== null && !isConverting;

  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      if (zipUrlRef.current) {
        URL.revokeObjectURL(zipUrlRef.current);
      }
    };
  }, []);

  const fileLabel = useMemo(() => {
    if (!file) {
      return "result.json";
    }

    return `${file.name} - ${formatBytes(file.size)}`;
  }, [file]);

  function selectFile(nextFile: File | undefined) {
    if (!nextFile) {
      return;
    }

    if (!nextFile.name.toLowerCase().endsWith(".json")) {
      setError("Нужен .json файл из Telegram Desktop export.");
      return;
    }

    revokeZipUrl();
    setFile(nextFile);
    setError(null);
    setResult(null);
    setProgress(null);
  }

  function handleFileInput(event: ChangeEvent<HTMLInputElement>) {
    selectFile(event.target.files?.[0]);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
    selectFile(event.dataTransfer.files?.[0]);
  }

  function handleDragOver(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(true);
  }

  function resetAll() {
    workerRef.current?.terminate();
    workerRef.current = null;
    revokeZipUrl();
    setFile(null);
    setProgress(null);
    setResult(null);
    setError(null);
  }

  function revokeZipUrl() {
    if (zipUrlRef.current) {
      URL.revokeObjectURL(zipUrlRef.current);
      zipUrlRef.current = null;
    }

    setZipUrl(null);
  }

  function updateBooleanOption(key: keyof ConverterOptions, value: boolean) {
    setOptions((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function startConversion() {
    if (!file) {
      setError("Сначала добавь result.json.");
      return;
    }

    workerRef.current?.terminate();
    revokeZipUrl();
    setResult(null);
    setError(null);
    setProgress({ progress: 1, label: "Стартую конвертер" });

    const worker = new Worker(new URL("../workers/converter.worker.ts", import.meta.url), {
      type: "module",
    });

    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const message = event.data;

      if (message.type === "progress") {
        setProgress({
          progress: message.progress,
          label: message.label,
        });
        return;
      }

      if (message.type === "error") {
        worker.terminate();
        workerRef.current = null;
        setProgress(null);
        setError(message.message);
        return;
      }

      worker.terminate();
      workerRef.current = null;
      const nextZipUrl = URL.createObjectURL(message.zipBlob);
      zipUrlRef.current = nextZipUrl;
      setZipUrl(nextZipUrl);
      setZipName(makeZipName(message.result.stats.chatName));
      setResult(message.result);
      setProgress(null);
    };

    worker.onerror = (event) => {
      worker.terminate();
      workerRef.current = null;
      setProgress(null);
      setError(event.message || "Worker упал во время обработки JSON.");
    };

    worker.postMessage({
      type: "convert",
      file,
      options,
    });
  }

  return (
    <main className="min-h-dvh overflow-hidden bg-[var(--ink)] text-[var(--paper)]">
      <div className="pixel-grid pointer-events-none fixed inset-0 opacity-80" />
      <div className="scanline pointer-events-none fixed inset-0" />

      <section className="relative mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-5 sm:px-6 lg:px-8">
        <nav className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
          <a className="group flex items-center gap-3" href="#top" aria-label="TeleLore">
            <span className="grid size-10 place-items-center border border-[var(--telegram)] bg-[var(--telegram)]/15 text-[var(--telegram)] shadow-[4px_4px_0_0_var(--shadow)]">
              <NotebookText size={20} aria-hidden="true" />
            </span>
            <span>
              <span className="block font-mono text-xs uppercase tracking-[0.26em] text-[var(--muted)]">
                Telegram to NotebookLM
              </span>
              <span className="block text-xl font-black leading-none">TeleLore</span>
            </span>
          </a>

          <div className="flex items-center gap-2">
            <a
              className="pixel-link"
              href="https://notebooklm.google/"
              target="_blank"
              rel="noreferrer"
            >
              NotebookLM
            </a>
            <a
              className="pixel-link"
              href="https://github.com/bakhtiersizhaev/telelore"
              target="_blank"
              rel="noreferrer"
            >
              <GitBranch size={15} aria-hidden="true" />
              GitHub
            </a>
          </div>
        </nav>

        <div id="top" className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_430px] lg:items-start">
          <div className="space-y-6 pt-4 lg:pt-10">
            <div className="inline-flex items-center gap-2 border border-[var(--telegram)]/60 bg-[var(--telegram)]/10 px-3 py-2 font-mono text-xs uppercase tracking-[0.22em] text-[var(--cyan)] shadow-[3px_3px_0_0_var(--shadow)]">
              <ShieldCheck size={15} aria-hidden="true" />
              Local browser processing
            </div>

            <div className="max-w-4xl">
              <h1 className="text-balance text-5xl font-black leading-[0.92] tracking-normal text-white sm:text-6xl lg:text-7xl">
                TeleLore
              </h1>
              <p className="mt-5 max-w-2xl text-pretty text-lg leading-8 text-[var(--muted)] sm:text-xl">
                Конвертер Telegram export JSON в аккуратные Markdown чанки для Google
                NotebookLM. Большой чат превращается в набор .md файлов, готовых к загрузке как
                sources.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <StatTile label="Формат" value=".json -> .md" />
              <StatTile label="Обработка" value="100% local" />
              <StatTile label="Цена" value="$0 / free" />
            </div>
          </div>

          <aside className="pixel-panel p-4 sm:p-5 lg:mt-8">
            <div className="grid grid-cols-4 gap-2">
              {["JSON", "WORDS", "MD", "ZIP"].map((item, index) => (
                <div key={item} className="quest-step">
                  <span>{index + 1}</span>
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-5 space-y-3 text-sm leading-6 text-[var(--muted)]">
              <p>
                Загрузить можно обычный{" "}
                <code className="border border-white/10 bg-black/25 px-1.5 py-0.5 font-mono text-[var(--cyan)]">
                  result.json
                </code>{" "}
                из Telegram Desktop: экспорт одного чата или полный экспорт аккаунта с чатами.
              </p>
              <p>
                На выходе ZIP с Markdown файлами. Каждый файл держится в выбранном лимите слов,
                чтобы NotebookLM не давился одним гигантским источником.
              </p>
            </div>
          </aside>
        </div>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="pixel-panel p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.22em] text-[var(--cyan)]">
                  Step 1
                </p>
                <h2 className="mt-1 text-2xl font-black">Загрузи Telegram JSON</h2>
              </div>
              {file ? (
                <button className="icon-button" type="button" onClick={resetAll} aria-label="Сбросить файл">
                  <RotateCcw size={18} aria-hidden="true" />
                </button>
              ) : null}
            </div>

            <label
              className={`dropzone mt-5 ${isDragging ? "dropzone-active" : ""}`}
              onDragOver={handleDragOver}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <input className="sr-only" type="file" accept=".json,application/json" onChange={handleFileInput} />
              <span className="grid size-16 place-items-center border border-[var(--telegram)] bg-[var(--telegram)]/15 text-[var(--telegram)] shadow-[5px_5px_0_0_var(--shadow)]">
                {file ? <FileJson size={30} aria-hidden="true" /> : <UploadCloud size={30} aria-hidden="true" />}
              </span>
              <span className="max-w-xl text-center">
                <span className="block text-lg font-black text-white">{fileLabel}</span>
                <span className="mt-2 block text-sm leading-6 text-[var(--muted)]">
                  Перетащи файл сюда или нажми на поле. Файл остается в браузере.
                </span>
              </span>
            </label>

            {error ? (
              <div className="mt-4 border border-[var(--danger)] bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger-light)]">
                {error}
              </div>
            ) : null}
          </div>

          <div className="pixel-panel p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <Settings2 className="text-[var(--cyan)]" size={22} aria-hidden="true" />
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.22em] text-[var(--cyan)]">
                  Step 2
                </p>
                <h2 className="text-2xl font-black">Настройки</h2>
              </div>
            </div>

            <div className="mt-5 space-y-5">
              <label className="field-label" htmlFor="words-per-file">
                Слов в одном .md
              </label>
              <select
                id="words-per-file"
                className="pixel-select"
                value={options.wordsPerFile}
                onChange={(event) =>
                  setOptions((current) => ({
                    ...current,
                    wordsPerFile: Number(event.target.value),
                  }))
                }
              >
                {WORD_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {formatNumber(value)}
                  </option>
                ))}
              </select>

              <label className="field-label" htmlFor="date-format">
                Формат даты
              </label>
              <select
                id="date-format"
                className="pixel-select"
                value={options.dateFormat}
                onChange={(event) =>
                  setOptions((current) => ({
                    ...current,
                    dateFormat: event.target.value as DateFormat,
                  }))
                }
              >
                <option value="ru">14.02.2020 21:30</option>
                <option value="iso">2020-02-14 21:30</option>
              </select>

              <div className="grid gap-2">
                <Toggle
                  label="Дата и время"
                  checked={options.includeDateTime}
                  onChange={(value) => updateBooleanOption("includeDateTime", value)}
                />
                <Toggle
                  label="Имя автора"
                  checked={options.includeAuthor}
                  onChange={(value) => updateBooleanOption("includeAuthor", value)}
                />
                <Toggle
                  label="Реакции"
                  checked={options.includeReactions}
                  onChange={(value) => updateBooleanOption("includeReactions", value)}
                />
                <Toggle
                  label="Опросы"
                  checked={options.includePolls}
                  onChange={(value) => updateBooleanOption("includePolls", value)}
                />
                <Toggle
                  label="Пересланные"
                  checked={options.includeForwards}
                  onChange={(value) => updateBooleanOption("includeForwards", value)}
                />
                <Toggle
                  label="Медиа-метаданные"
                  checked={options.includeMedia}
                  onChange={(value) => updateBooleanOption("includeMedia", value)}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="pixel-panel p-4 sm:p-6">
          <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-[var(--cyan)]">
                Step 3
              </p>
              <h2 className="mt-1 text-2xl font-black">Собери NotebookLM pack</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">
                Worker читает JSON, нормализует сообщения, режет чат по словам и собирает ZIP с
                Markdown источниками.
              </p>
            </div>

            <button
              className="primary-button"
              type="button"
              disabled={!canConvert}
              onClick={startConversion}
            >
              {isConverting ? (
                <Loader2 className="animate-spin" size={20} aria-hidden="true" />
              ) : (
                <Zap size={20} aria-hidden="true" />
              )}
              Конвертировать
            </button>
          </div>

          {progress ? (
            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between gap-3 font-mono text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                <span>{progress.label}</span>
                <span>{Math.round(progress.progress)}%</span>
              </div>
              <div className="h-3 border border-white/15 bg-black/35">
                <div
                  className="h-full bg-[var(--telegram)] transition-[width] duration-300"
                  style={{ width: `${progress.progress}%` }}
                />
              </div>
            </div>
          ) : null}
        </section>

        {result ? (
          <section className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
            <div className="pixel-panel p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="text-[var(--success)]" size={24} aria-hidden="true" />
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.22em] text-[var(--cyan)]">
                    Step 4
                  </p>
                  <h2 className="text-2xl font-black">ZIP готов</h2>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <Metric label="Чанков" value={formatNumber(result.stats.chunks)} />
                <Metric label="Слов" value={formatNumber(result.stats.totalWords)} />
                <Metric label="Сообщений" value={formatNumber(result.stats.includedMessages)} />
                <Metric
                  label={result.stats.sourceFormat === "account" ? "Чатов" : "Авторов"}
                  value={formatNumber(
                    result.stats.sourceFormat === "account"
                      ? result.stats.chatCount
                      : result.stats.authors,
                  )}
                />
              </div>

              {zipUrl ? (
                <a className="download-button mt-5" href={zipUrl} download={zipName}>
                  <Download size={20} aria-hidden="true" />
                  Скачать ZIP
                </a>
              ) : null}
            </div>

            <div className="pixel-panel p-4 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.22em] text-[var(--cyan)]">
                    Markdown files
                  </p>
                  <h2 className="mt-1 text-2xl font-black">{result.stats.chatName}</h2>
                </div>
                <div className="inline-flex items-center gap-2 border border-white/15 bg-white/[0.04] px-3 py-2 font-mono text-xs text-[var(--muted)]">
                  <Archive size={15} aria-hidden="true" />
                  {formatBytes(result.files.reduce((sum, item) => sum + item.bytes, 0))}
                </div>
              </div>

              <div className="mt-5 overflow-hidden border border-white/10">
                <div className="max-h-72 overflow-auto">
                  <table className="w-full min-w-[640px] border-collapse text-sm">
                    <thead className="sticky top-0 bg-[var(--panel)] text-left font-mono text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                      <tr>
                        <th className="border-b border-white/10 px-3 py-3">Файл</th>
                        <th className="border-b border-white/10 px-3 py-3 text-right">Слов</th>
                        <th className="border-b border-white/10 px-3 py-3 text-right">Сообщений</th>
                        <th className="border-b border-white/10 px-3 py-3">Диапазон</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.files.map((item) => (
                        <tr key={item.name} className="border-b border-white/5 last:border-b-0">
                          <td className="px-3 py-3 font-mono text-xs text-[var(--paper)]">
                            {item.name}
                          </td>
                          <td className="px-3 py-3 text-right text-[var(--muted)]">
                            {formatNumber(item.words)}
                          </td>
                          <td className="px-3 py-3 text-right text-[var(--muted)]">
                            {formatNumber(item.messages)}
                          </td>
                          <td className="px-3 py-3 text-[var(--muted)]">
                            {item.firstDate && item.lastDate
                              ? `${item.firstDate} - ${item.lastDate}`
                              : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {result.files[0]?.preview ? (
                <pre className="mt-5 max-h-80 overflow-auto border border-white/10 bg-black/35 p-4 font-mono text-xs leading-5 text-[var(--muted)]">
                  {result.files[0].preview}
                </pre>
              ) : null}
            </div>
          </section>
        ) : null}

        <section className="grid gap-4 pb-8 md:grid-cols-3">
          <InfoBlock
            title="NotebookLM ready"
            text="Выходные .md файлы можно добавить как отдельные sources в Google NotebookLM."
          />
          <InfoBlock
            title="Huge chat friendly"
            text="Чанк считается по словам, а не по байтам, поэтому длинные реплики остаются читаемыми."
          />
          <InfoBlock
            title="Open source"
            text="Проект готов для публичного GitHub: README, тесты, SEO metadata и Vercel deploy."
          />
        </section>
      </section>
    </main>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="toggle-row">
      <input
        className="sr-only"
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="toggle-box" aria-hidden="true">
        {checked ? <CheckCircle2 size={16} /> : null}
      </span>
      <span>{label}</span>
    </label>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-white/10 bg-white/[0.04] p-4 shadow-[4px_4px_0_0_var(--shadow)]">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-2 text-xl font-black text-white">{value}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-white/10 bg-black/25 p-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </div>
  );
}

function InfoBlock({ title, text }: { title: string; text: string }) {
  return (
    <article className="border border-white/10 bg-white/[0.035] p-5 shadow-[4px_4px_0_0_var(--shadow)]">
      <h3 className="text-lg font-black">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{text}</p>
    </article>
  );
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("ru-RU").format(value);
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

function makeZipName(chatName: string): string {
  const slug = chatName
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return `${slug || "telegram-chat"}-telelore-notebooklm.zip`;
}
