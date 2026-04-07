"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface Props {
  items: BreadcrumbItem[];
}

export default function BreadcrumbMenu({ items }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-center w-8 h-8 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
        aria-label="Navigation menu"
      >
        {/* Hamburger icon */}
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect y="2"  width="16" height="1.5" rx="0.75" fill="currentColor" />
          <rect y="7"  width="16" height="1.5" rx="0.75" fill="currentColor" />
          <rect y="12" width="16" height="1.5" rx="0.75" fill="currentColor" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-zinc-200 rounded-lg shadow-lg z-50 py-1 overflow-hidden">
          {items.map((item, i) => {
            const isLast = i === items.length - 1;
            return (
              <div key={i}>
                {item.href && !isLast ? (
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 transition-colors"
                  >
                    {i > 0 && (
                      <span className="text-zinc-300 text-xs">{"›".repeat(i)}</span>
                    )}
                    {item.label}
                  </Link>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-zinc-900">
                    {i > 0 && (
                      <span className="text-zinc-300 text-xs">{"›".repeat(i)}</span>
                    )}
                    {item.label}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}