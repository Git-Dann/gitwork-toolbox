import type { ReactNode } from "react";

/**
 * Enough markdown for the two things that carry it: Foundry starter descriptions
 * (bold, inline code, dash lists) and the DESIGN.md specs, which add headings,
 * tables, fenced code and links.
 *
 * Still no dependency and no dangerouslySetInnerHTML — the specs are third-party
 * documents, so nothing in them gets a route to the DOM as markup.
 */

const INLINE = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;

function inline(text: string, keyPrefix: string): ReactNode[] {
  return text.split(INLINE).map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return <code key={key}>{part.slice(1, -1)}</code>;
    }
    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (link) {
      const href = link[2];
      // Only http(s) and in-site paths — a markdown link is untrusted text, and
      // javascript: or data: in an href is the one way this could bite.
      const safe = /^(https?:\/\/|\/)/.test(href);
      return safe ? (
        <a
          key={key}
          href={href}
          {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        >
          {link[1]}
        </a>
      ) : (
        link[1]
      );
    }
    return part;
  });
}

const HEADING_CLASS: Record<number, string> = {
  1: "display mt-8 mb-3 text-2xl",
  2: "display mt-8 mb-3 text-xl",
  3: "mt-6 mb-2 text-[0.95rem] font-medium",
  4: "label mt-5 mb-2 text-mute",
};

/** A row of a pipe table, minus the leading and trailing pipes. */
const cells = (line: string) =>
  line
    .replace(/^\s*\|/, "")
    .replace(/\|\s*$/, "")
    .split("|")
    .map((cell) => cell.trim());

const isDivider = (line: string) => /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(line) && line.includes("-");

export function Markdown({ text, className }: { text: string; className?: string }) {
  const blocks: ReactNode[] = [];
  const lines = text.split("\n");

  let list: string[] = [];
  const flushList = () => {
    if (!list.length) return;
    const items = list;
    list = [];
    blocks.push(
      <ul key={`ul-${blocks.length}`}>
        {items.map((item, i) => (
          <li key={i}>{inline(item, `li-${blocks.length}-${i}`)}</li>
        ))}
      </ul>,
    );
  };

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i];
    const line = raw.trim();

    if (!line) {
      flushList();
      continue;
    }

    // Fenced code — kept verbatim, including the language tag's content.
    if (line.startsWith("```")) {
      flushList();
      const body: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        body.push(lines[i]);
        i += 1;
      }
      blocks.push(
        <pre
          key={`pre-${blocks.length}`}
          className="my-4 overflow-x-auto rounded-lg border p-3 text-[0.8rem]"
          style={{ borderColor: "var(--border)", background: "var(--bg-input)" }}
        >
          <code>{body.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      flushList();
      const level = heading[1].length;
      const Tag = (["h2", "h3", "h4", "h5"] as const)[level - 1];
      blocks.push(
        <Tag key={`h-${blocks.length}`} className={HEADING_CLASS[level]}>
          {inline(heading[2], `h-${blocks.length}`)}
        </Tag>,
      );
      continue;
    }

    // Pipe table: a header row, a divider, then rows until the block ends.
    if (line.startsWith("|") && isDivider(lines[i + 1] ?? "")) {
      flushList();
      const header = cells(line);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        rows.push(cells(lines[i]));
        i += 1;
      }
      i -= 1;
      blocks.push(
        <div key={`t-${blocks.length}`} className="my-4 overflow-x-auto">
          <table className="w-full border-collapse text-left text-[0.85rem]">
            <thead>
              <tr>
                {header.map((cell, c) => (
                  <th
                    key={c}
                    className="label border-b px-2.5 py-2 text-mute"
                    style={{ borderColor: "var(--border)" }}
                  >
                    {inline(cell, `th-${blocks.length}-${c}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, c) => (
                    <td
                      key={c}
                      className="border-b px-2.5 py-2 align-top text-soft"
                      style={{ borderColor: "var(--hair, var(--border))" }}
                    >
                      {inline(cell, `td-${blocks.length}-${r}-${c}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    if (/^(---+|\*\*\*+)$/.test(line)) {
      flushList();
      blocks.push(
        <hr
          key={`hr-${blocks.length}`}
          className="my-6"
          style={{ borderColor: "var(--border)" }}
        />,
      );
      continue;
    }

    const bullet = /^[-*]\s+(.*)$/.exec(line);
    if (bullet) {
      list.push(bullet[1]);
      continue;
    }

    flushList();
    blocks.push(<p key={`p-${blocks.length}`}>{inline(line, `p-${blocks.length}`)}</p>);
  }
  flushList();

  return <div className={className}>{blocks}</div>;
}
