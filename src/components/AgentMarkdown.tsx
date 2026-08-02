import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { cn } from '@/lib/utils';

const BRAND_GREEN = '#16a34a';

/** Renders agent replies as GitHub-flavored markdown, styled for the chat surfaces. */
export const AgentMarkdown = ({ children, className }: { children: string; className?: string }) => (
  <div className={cn('agent-markdown min-w-0 [overflow-wrap:anywhere]', className)}>
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children: c }) => <p className="my-2 first:mt-0 last:mb-0">{c}</p>,
        ul: ({ children: c }) => <ul className="my-2 list-disc space-y-1 pl-5 first:mt-0 last:mb-0 marker:text-[#16a34a]">{c}</ul>,
        ol: ({ children: c }) => <ol className="my-2 list-decimal space-y-1 pl-5 first:mt-0 last:mb-0 marker:text-[#16a34a]">{c}</ol>,
        li: ({ children: c }) => <li className="[&>p]:my-0">{c}</li>,
        h1: ({ children: c }) => <h3 className="mb-2 mt-5 border-l-[3px] border-[#16a34a] pl-2.5 text-[1.05em] font-semibold text-[#003f2e] first:mt-0">{c}</h3>,
        h2: ({ children: c }) => <h3 className="mb-2 mt-5 border-l-[3px] border-[#16a34a] pl-2.5 text-[1.05em] font-semibold text-[#003f2e] first:mt-0">{c}</h3>,
        h3: ({ children: c }) => <h4 className="mb-1.5 mt-3 font-semibold text-[#16a34a] first:mt-0">{c}</h4>,
        strong: ({ children: c }) => <strong className="font-semibold text-black">{c}</strong>,
        a: ({ href, children: c }) => (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-[#16a34a] underline decoration-[#16a34a]/30 underline-offset-2 transition-colors hover:decoration-[#16a34a]"
          >
            {c}
          </a>
        ),
        code: ({ children: c }) => <code className="rounded bg-[#16a34a]/[0.07] px-1 py-0.5 text-[0.9em] text-[#003f2e]">{c}</code>,
        pre: ({ children: c }) => (
          <pre className="my-2 overflow-x-auto rounded-lg bg-[#003f2e]/[0.04] p-3 text-[0.85em] leading-relaxed [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-inherit">
            {c}
          </pre>
        ),
        blockquote: ({ children: c }) => (
          <blockquote className="my-2 border-l-2 border-[#16a34a]/40 pl-3 text-gray-600">{c}</blockquote>
        ),
        hr: () => <hr className="my-3 border-[#16a34a]/20" />,
        table: ({ children: c }) => (
          <div className="my-2 overflow-x-auto">
            <table className="w-full border-collapse text-[0.92em]">{c}</table>
          </div>
        ),
        th: ({ children: c }) => (
          <th className="border-b-2 border-[#16a34a]/25 bg-[#16a34a]/[0.05] px-2 py-1.5 text-left font-semibold text-[#003f2e]">{c}</th>
        ),
        td: ({ children: c }) => <td className="border-b border-black/5 px-2 py-1.5 align-top">{c}</td>,
      }}
    >
      {children}
    </ReactMarkdown>
  </div>
);
