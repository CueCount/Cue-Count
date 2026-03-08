"use client";

import { useRouter } from "next/navigation";

function ChevronIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export type BreadcrumbItem = {
  label: string;
  href?: string;  // if provided, item is clickable
};

type Props = {
  items: BreadcrumbItem[];
};

export default function Breadcrumb({ items }: Props) {
  const router = useRouter();

  return (
    <nav className="w-full px-8 py-4 border-b border-zinc-100 bg-white flex items-center gap-1.5 text-sm text-zinc-400">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <span key={index} className="flex items-center gap-1.5">
            {index > 0 && <ChevronIcon />}
            {item.href && !isLast ? (
              <span
                className="hover:text-zinc-600 cursor-pointer transition-colors"
                onClick={() => router.push(item.href!)}
              >
                {item.label}
              </span>
            ) : (
              <span className={isLast ? "text-zinc-700 font-medium" : ""}>
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}