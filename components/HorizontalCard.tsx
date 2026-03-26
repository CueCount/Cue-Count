import Link from "next/link";
import type { PerspectiveRow, StoryRow, TrendRow } from "@/types/db";

function ProjectionsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}

function ContributorsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="4" height="18" rx="1" />
      <rect x="10" y="8" width="4" height="13" rx="1" />
      <rect x="17" y="5" width="4" height="16" rx="1" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

type Props =
  | { type: "perspective"; data: PerspectiveRow; href?: string }
  | { type: "story";       data: StoryRow;       href?: string }
  | { type: "trend";       data: TrendRow;       href?: string }

export default function HorizontalCard({ type, data, href }: Props) {
  const content = (
    <div className="flex items-center justify-between px-5 py-4 border border-zinc-100 hover:border-pink-200 hover:bg-pink-50 transition-all duration-200 cursor-pointer">

      <h3>{data.name}</h3>

      <div>
        {type === "perspective" && (
          <span>{data.plan}</span>
        )}
        {type === "story" && (
          <span>Updated {data.updatedAt}</span>
        )}
        {type === "trend" && (
          <span>{data.source} · {data.unit}</span>
        )}
      </div>

    </div>
  );

  if (href) {
    return <Link href={href} className="w-full">{content}</Link>;
  }

  return content;
}