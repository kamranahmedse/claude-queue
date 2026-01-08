import { memo } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CopyButton } from "./copy-button";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer = memo(function MarkdownRenderer(
  props: MarkdownRendererProps
) {
  const { content, className = "" } = props;

  return (
    <div className={`break-words ${className}`}>
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: (props) => {
            const { children } = props;
            return (
              <div className="text-base font-semibold text-zinc-100 mt-3 mb-1.5">
                {children}
              </div>
            );
          },
          h2: (props) => {
            const { children } = props;
            return (
              <div className="text-sm font-semibold text-zinc-100 mt-3 mb-1.5">
                {children}
              </div>
            );
          },
          h3: (props) => {
            const { children } = props;
            return (
              <div className="text-[13px] font-medium text-zinc-100 mt-3 mb-1.5">
                {children}
              </div>
            );
          },
          h4: (props) => {
            const { children } = props;
            return (
              <div className="text-[13px] font-medium text-zinc-100 mt-2 mb-1">
                {children}
              </div>
            );
          },
          h5: (props) => {
            const { children } = props;
            return (
              <div className="text-[13px] font-medium text-zinc-100 mt-2 mb-1">
                {children}
              </div>
            );
          },
          h6: (props) => {
            const { children } = props;
            return (
              <div className="text-[13px] font-medium text-zinc-100 mt-2 mb-1">
                {children}
              </div>
            );
          },
          p: (props) => {
            const { children } = props;
            return (
              <p className="text-sm leading-relaxed text-zinc-300 whitespace-pre-wrap my-1.5 first:mt-0 last:mb-0">
                {children}
              </p>
            );
          },
          a: (props) => {
            const { href, children } = props;
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2"
              >
                {children}
              </a>
            );
          },
          strong: (props) => {
            const { children } = props;
            return (
              <strong className="font-semibold text-zinc-50">{children}</strong>
            );
          },
          em: (props) => {
            const { children } = props;
            return <em className="italic text-zinc-200">{children}</em>;
          },
          code: (props) => {
            const { children } = props;
            return (
              <code className="px-1.5 py-0.5 rounded bg-zinc-800/80 text-cyan-300 text-[12px] font-mono">
                {children}
              </code>
            );
          },
          pre: (props) => {
            const { node } = props as {
              node?: {
                children?: Array<{
                  tagName?: string;
                  properties?: { className?: string[] };
                  children?: Array<{ value?: string }>;
                }>;
              };
            };
            const codeNode = node?.children?.[0];

            if (codeNode?.tagName === "code") {
              const classNames = codeNode.properties?.className || [];
              const langClass = classNames.find((c) => c.startsWith("language-"));
              const language = langClass?.replace("language-", "") || "code";
              const codeContent =
                codeNode.children?.map((c) => c.value).join("") || "";

              return (
                <div className="relative group my-2 rounded-lg overflow-hidden border border-zinc-700/50">
                  <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900 border-b border-zinc-700/50">
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {language}
                    </span>
                    <CopyButton text={codeContent} />
                  </div>
                  <pre className="text-xs text-zinc-300 bg-zinc-900/80 p-3 overflow-x-auto">
                    <code>{codeContent}</code>
                  </pre>
                </div>
              );
            }

            const { children } = props;
            return <pre>{children}</pre>;
          },
          ul: (props) => {
            const { children } = props;
            return (
              <ul className="my-2 ml-3 space-y-1 list-disc list-inside text-zinc-200">
                {children}
              </ul>
            );
          },
          ol: (props) => {
            const { children } = props;
            return (
              <ol className="my-2 ml-3 space-y-1 list-decimal list-inside text-zinc-200">
                {children}
              </ol>
            );
          },
          li: (props) => {
            const { children } = props;
            return <li className="text-sm leading-relaxed">{children}</li>;
          },
          blockquote: (props) => {
            const { children } = props;
            return (
              <div className="border-l-2 border-zinc-600 pl-3 my-2 text-zinc-400 italic">
                {children}
              </div>
            );
          },
          hr: () => <hr className="border-zinc-700 my-4" />,
          table: (props) => {
            const { children } = props;
            return (
              <div className="my-2 overflow-x-auto rounded-lg border border-zinc-700/50">
                <table className="w-full text-sm">{children}</table>
              </div>
            );
          },
          thead: (props) => {
            const { children } = props;
            return <thead className="bg-zinc-900">{children}</thead>;
          },
          tr: (props) => {
            const { children } = props;
            return (
              <tr className="border-b border-zinc-700/50 last:border-b-0">
                {children}
              </tr>
            );
          },
          th: (props) => {
            const { children } = props;
            return (
              <th className="px-3 py-2 text-left font-medium text-zinc-200">
                {children}
              </th>
            );
          },
          td: (props) => {
            const { children } = props;
            return <td className="px-3 py-2 text-zinc-300">{children}</td>;
          },
        }}
      >
        {content}
      </Markdown>
    </div>
  );
});
