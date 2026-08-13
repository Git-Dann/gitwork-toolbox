import Link from "next/link";
import { Container } from "@/components/page-shell";
import { Eyebrow } from "@/components/ui";

export default function NotFound() {
  return (
    <Container className="py-24 text-center">
      <Eyebrow accent>404</Eyebrow>
      <h1 className="display mt-5 text-4xl">
        That one isn&apos;t on the list
        <span className="text-accent">.</span>
      </h1>
      <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-soft">
        The page may have been renamed when the workbook was last rebuilt. Search with ⌘K, or start
        from the starter library.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/starters"
          className="rounded-full px-5 py-2.5 text-sm"
          style={{ background: "var(--accent)", color: "var(--on-accent)" }}
        >
          Starter library
        </Link>
        <Link
          href="/"
          className="rounded-full border px-5 py-2.5 text-sm transition-colors hover:border-[var(--accent)]"
          style={{ borderColor: "var(--border-strong)" }}
        >
          Home
        </Link>
      </div>
    </Container>
  );
}
