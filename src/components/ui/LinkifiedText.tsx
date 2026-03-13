import { ExternalLink } from "lucide-react";

// Matches http(s) URLs; capturing group so split() keeps the matches.
// Excludes ASCII delimiters AND CJK/full-width characters (U+3000–U+FFFF)
// so that e.g. 「）」 「。」 after a URL are never captured as part of it.
const URL_REGEX = /(https?:\/\/[^\s<>"{}|\\^`[\]\u3000-\uFFFF]+)/g;

// Trailing ASCII punctuation that is likely not part of the URL
const TRAILING_PUNCT = /[.,;:!?'")\]}>]+$/;

type Props = {
  text: string;
  className?: string;
};

/**
 * Renders text with URLs auto-linked.
 * Links open in a new tab and include an ExternalLink icon.
 * Clicking a link does NOT bubble up (safe inside click-to-edit containers).
 */
export default function LinkifiedText({ text, className }: Props) {
  // split() with a capturing group interleaves plain-text and URL segments
  const parts = text.split(URL_REGEX);

  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (/^https?:\/\//.test(part)) {
          // Strip trailing punctuation that is almost certainly not part of the URL
          const url = part.replace(TRAILING_PUNCT, "");
          const suffix = part.slice(url.length);
          return (
            <span key={i}>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-baseline gap-0.5 text-sky-600 hover:text-sky-700 underline decoration-sky-300 underline-offset-2 break-all"
              >
                <ExternalLink size={11} className="flex-shrink-0 translate-y-[1px]" />
                {url}
              </a>
              {suffix}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}
