import { type FC } from "react";
import ReactMarkdown from "react-markdown";
import { twJoin } from "tailwind-merge";

export const MessageContent: FC<{ content: string }> = ({ content }) => {
  return (
    <ReactMarkdown
      components={{
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-soft decoration-dim hover:text-primary hover:decoration-primary underline underline-offset-4"
          >
            {children}
          </a>
        ),
        p: ({ children }) => (
          <p className="mb-4 max-w-[72ch] leading-7 last:mb-0">{children}</p>
        ),
        h1: ({ children }) => (
          <h1 className="mt-3 mb-1 text-xl font-bold first:mt-0">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="mt-6 mb-3 text-lg font-semibold first:mt-0">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="mt-2 mb-1 font-bold first:mt-0">{children}</h3>
        ),
        h4: ({ children }) => (
          <h4 className="mt-2 mb-1 font-semibold first:mt-0">{children}</h4>
        ),
        ul: ({ children }) => (
          <ul className="mb-4 ml-5 max-w-[72ch] list-disc space-y-2 last:mb-0">
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="mb-4 ml-5 max-w-[72ch] list-decimal space-y-2 last:mb-0">
            {children}
          </ol>
        ),
        li: ({ children }) => (
          <li className="mb-1 leading-7 last:mb-0">{children}</li>
        ),
        code: ({ children, className }) => {
          return className ? (
            <code
              className={twJoin(
                className,
                "bg-primary/10 block overflow-x-auto rounded p-2 text-sm",
              )}
            >
              {children}
            </code>
          ) : (
            <code className="bg-primary/10 rounded px-1 py-0.5 text-sm">
              {children}
            </code>
          );
        },
        pre: ({ children }) => <pre className="mb-2 last:mb-0">{children}</pre>,
        blockquote: ({ children }) => (
          <blockquote className="border-primary/30 mb-2 border-l-2 pl-3 italic last:mb-0">
            {children}
          </blockquote>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
};
