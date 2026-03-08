import Link from "next/link";
import type { WorkspaceCard as WorkspaceCardType } from "@/lib/workspace_data";
import type { StoryCard } from "@/lib/story_data";

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

type Props = {
  workspace: WorkspaceCardType | StoryCard;
  index: number;
  href?: string;  // explicit link — overrides default behaviour
};

export default function WorkspaceCard({ workspace, index, href }: Props) {
  const content = (
    <div className="
      bg-white rounded-xl border border-zinc-100 p-5
      hover:border-pink-200 hover:shadow-md hover:shadow-pink-50
      transition-all duration-200 cursor-pointer
      flex flex-col gap-4
    ">
      <h3 className="text-zinc-800 text-base font-medium leading-snug">
        {workspace.title}
      </h3>
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5 text-xs font-medium text-pink-500">
          <ProjectionsIcon />
          {workspace.projections} Projections
        </span>
        <span className="flex items-center gap-1.5 text-xs font-medium text-pink-500">
          <ContributorsIcon />
          {workspace.contributors} Contributors
        </span>
      </div>
      {workspace.hasNewData && (
        <div className="flex">
          <span className="flex items-center gap-1.5 text-xs font-medium text-pink-500 bg-pink-50 border border-pink-200 px-2.5 py-1 rounded-md">
            <AlertIcon />
            New Data
          </span>
        </div>
      )}
    </div>
  );

  // Use explicit href if provided, otherwise default first-card behaviour
  const destination = href ?? (index === 0 ? "/workspace" : null);

  if (destination) {
    return <Link href={destination}>{content}</Link>;
  }

  return content;
}