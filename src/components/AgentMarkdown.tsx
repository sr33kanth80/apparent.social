import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { cn } from '@/lib/utils';

/** Renders agent replies as GitHub-flavored markdown, styled for the chat surfaces. */
export const AgentMarkdown = ({ children, className }: { children: string; className?: string }) => (
  <div className={cn('agent-markdown min-w-0 [overflow-wrap:anywhere]', className)}>
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children: c }) => <p className="my-2 first:mt-0 last:mb-0">{c}</p>,
        ul: ({ children: c }) => <ul className="my-2 list-disc space-y-1 pl-5 first:mt-0 last:mb-0">{c}</ul>,
        ol: ({ children: c }) => <ol className="my-2 list-decimal space-y-1 pl-5 first:mt-0 last:mb-0">{c}</ol>,
        li: ({ children: c }) => <li className="[&>p]:my-0">{c}</li>,
        h1: ({ children: c }) => <h3 className="mb-2 mt-4 text-[1.05em] font-semibold text-[#003f2e] first:mt-0">{c}</h3>,
        h2: ({ children: c }) => <h3 className="mb-2 mt-4 text-[1.05em] font-semibold text-[#003f2e] first:mt-0">{c}</h3>,
        h3: ({ children: c }) => <h4 className="mb-1.5 mt-3 font-semibold text-[#003f2e] first:mt-0">{c}</h4>,
        strong: ({ children: c }) => <strong className="font-semibold text-black">{c}</strong>,
        a: ({ href, children: c }) => (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-[#003f2e] underline decoration-[#003f2e]/30 underline-offset-2 transition-colors hover:decoration-[#003f2e]"
          >
            {c}
          </a>
        ),
        code: ({ children: c }) => <code className="rounded bg-black/[0.06] px-1 py-0.5 text-[0.9em]">{c}</code>,
        pre: ({ children: c }) => (
          <pre className="my-2 overflow-x-auto rounded-lg bg-black/[0.04] p-3 text-[0.85em] leading-relaxed [&_code]:bg-transparent [&_code]:p-0">
            {c}
          </pre>
        ),
        blockquote: ({ children: c }) => (
          <blockquote className="my-2 border-l-2 border-black/15 pl-3 text-gray-600">{c}</blockquote>
        ),
        hr: () => <hr className="my-3 border-black/10" />,
        table: ({ children: c }) => (
          <div className="my-2 overflow-x-auto">
            <table className="w-full border-collapse text-[0.92em]">{c}</table>
          </div>
        ),
        th: ({ children: c }) => (
          <th className="border-b border-black/15 px-2 py-1.5 text-left font-semibold text-black">{c}</th>
        ),
        td: ({ children: c }) => <td className="border-b border-black/5 px-2 py-1.5 align-top">{c}</td>,
      }}
    >
      {children}
    </ReactMarkdown>
  </div>
);
