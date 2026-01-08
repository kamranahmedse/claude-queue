import { Copy, Check } from "lucide-react";
import { useCopyToClipboard } from "~/hooks/use-copy-to-clipboard";

interface CopyButtonProps {
  text: string;
  className?: string;
}

export function CopyButton(props: CopyButtonProps) {
  const { text, className = "" } = props;

  const { copied, copy } = useCopyToClipboard();

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        copy(text);
      }}
      className={`p-1 rounded transition-colors ${className}`}
      title="Copy to clipboard"
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-green-400" />
      ) : (
        <Copy className="w-3.5 h-3.5 text-zinc-500 hover:text-zinc-300" />
      )}
    </button>
  );
}
