import Link from "next/link";
import { Container } from "@/components/page-shell";
import { Eyebrow } from "@/components/ui";

export default function NotFound() {
  return (
    <Container className="py-24 text-center">
      <Eyebrow>404</Eyebrow>
      <h1 className="mt-4 font-display text-4xl">That one isn't on the list.</h1>
      <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-mute">
        The page may have been renamed when the workbook was last rebuilt. Search with ⌘K, or start
        from the tools list.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/tools"
          className="rounded-full bg-ink px-5 py-2.5 text-sm text-paper transition-opacity hover:opacity-85"
        >
          All tools
        </Link>
        <Link
          href="/"
          className="hairline rounded-full border bg-white px-5 py-2.5 text-sm transition-colors hover:border-signal/50 hover:text-signal"
        >
          Home
        </Link>
      </div>
    </Container>
  );
}
