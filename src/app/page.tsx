import { ConverterApp } from "@/components/ConverterApp";

export default function Home() {
  return (
    <>
      <ConverterApp />
      <footer className="bg-[var(--ink)] px-4 pb-8 text-[var(--paper)] sm:px-6 lg:px-8">
        <section
          className="mx-auto grid w-full max-w-7xl gap-4 border border-white/10 bg-white/[0.035] p-5 shadow-[5px_5px_0_0_var(--shadow)] md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
          aria-labelledby="related-tool-title"
        >
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-[var(--cyan)]">
              NotebookLM toolchain
            </p>
            <h2 id="related-tool-title" className="mt-1 text-2xl font-black">
              Need YouTube sources too?
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
              TubeLM Link Picker helps select YouTube videos and Shorts, copy clean URLs in bulk,
              and paste them into NotebookLM.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 md:justify-end">
            <a
              className="pixel-link"
              href="https://bakhtiersizhaev.github.io/tubelm-link-picker/"
              target="_blank"
              rel="noreferrer"
            >
              Open TubeLM
            </a>
            <a
              className="pixel-link"
              href="https://github.com/bakhtiersizhaev/tubelm-link-picker"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
          </div>
        </section>
      </footer>
    </>
  );
}
