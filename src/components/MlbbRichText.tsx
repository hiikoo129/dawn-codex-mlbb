import { parseMlbbMarkup } from '../utils/mlbbParser';

interface MlbbRichTextProps {
  text: string;
  className?: string;
}

export function MlbbRichText({ text, className = '' }: MlbbRichTextProps) {
  const segments = parseMlbbMarkup(text);
  return (
    <span className={`whitespace-pre-line ${className}`}>
      {segments.map((seg, idx) =>
        seg.color ? (
          <span key={idx} style={{ color: seg.color }} className="font-medium">
            {seg.text}
          </span>
        ) : (
          <span key={idx}>{seg.text}</span>
        )
      )}
    </span>
  );
}
