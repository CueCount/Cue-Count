"use client";

import { useEffect, useState, useCallback } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import Link from "next/link";
import {
  Globe,
  BarChart3,
  Heart,
  Search,
  ArrowRight,
  ArrowUpRight,
  X,
  Settings as SettingsIcon,
  ExternalLink,
  LifeBuoy,
} from "lucide-react";
import { DataProvider, useData } from "@/contexts/DataState";
import HorizontalCard from "@/components/HorizontalCard";

type Story = { id: string; [key: string]: any };

function UserPageInner() {
  const [user, setUser] = useState<User | null>(null);
  const [perspectivesOpen, setPerspectivesOpen] = useState(false);
  const [linkedOpen, setLinkedOpen] = useState(false);
  const [linkedStories, setLinkedStories] = useState<Story[]>([]);
  const [linkedLoading, setLinkedLoading] = useState(false);

  const { perspectives, perspectivesLoading, fetchPerspectives } = useData();

  // Resolve auth + load perspectives
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) fetchPerspectives(u.uid);
    });
    return () => unsubscribe();
  }, [fetchPerspectives]);

  // Stories where the current user has Viewer permissions.
  // Assumes each story doc has a `permissions.viewers` array of UIDs.
  const fetchLinkedStories = useCallback(async (uid: string) => {
    setLinkedLoading(true);
    try {
      const ref = collection(db, "stories");
      const q = query(ref, where("permissions.viewers", "array-contains", uid));
      const snap = await getDocs(q);
      setLinkedStories(
        snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Story[]
      );
    } catch (e) {
      console.error("Failed to fetch linked stories:", e);
    } finally {
      setLinkedLoading(false);
    }
  }, []);

  // Pre-fetch so the count is accurate on the card itself.
  useEffect(() => {
    if (user) fetchLinkedStories(user.uid);
  }, [user, fetchLinkedStories]);

  const displayName = user?.displayName ?? "User";
  const avatarUrl = user?.photoURL ?? undefined;

  // TODO: wire these up when Pinned/Public stories land.
  const pinnedCount = 0;
  const publicCount = 0;

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Header */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between px-8 py-5">
        <div className="flex items-center gap-3">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-9 h-9 rounded-full object-cover"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-zinc-200" />
          )}
          <span className="font-mono text-sm text-zinc-900">{displayName}</span>
          <span className="font-mono text-sm text-pink-500">Active</span>
        </div>
        <nav className="flex items-center gap-6 font-mono text-sm">
          <Link
            href="/subscription"
            className="text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1.5"
          >
            Subscription Details <ExternalLink className="w-3.5 h-3.5" />
          </Link>
          <Link
            href="/settings"
            className="text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1.5"
          >
            Settings <SettingsIcon className="w-3.5 h-3.5" />
          </Link>
        </nav>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-8 py-8">
        <div className="w-full max-w-3xl space-y-4">
          {/* Top row: 2 cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CardButton onClick={() => setPerspectivesOpen(true)}>
              <Globe className="w-6 h-6 text-zinc-900" strokeWidth={1.5} />
              <h2 className="text-3xl font-medium text-zinc-900 mt-3">
                {perspectives.length} Perspectives
              </h2>
              <p className="font-mono text-xs text-zinc-700 leading-relaxed mt-2">
                You own and are admin of.{" "}
                {Math.max(0, 3 - perspectives.length)} more available with
                basic plan.
              </p>
              <div className="flex justify-end mt-6">
                <ViewLink />
              </div>
            </CardButton>

            <CardButton onClick={() => setLinkedOpen(true)}>
              <BarChart3 className="w-6 h-6 text-zinc-900" strokeWidth={1.5} />
              <h2 className="text-3xl font-medium text-zinc-900 mt-3">
                {linkedStories.length} Linked Stories
              </h2>
              <p className="font-mono text-xs text-zinc-700 leading-relaxed mt-2">
                Shared with you, giving you Viewer Permissions
              </p>
              <div className="flex justify-end mt-6">
                <ViewLink />
              </div>
            </CardButton>
          </div>

          {/* Pinned Stories — unclickable for now */}
          <div
            className="bg-zinc-50 rounded-xl px-6 py-4 flex items-center justify-between"
            aria-disabled="true"
          >
            <div className="flex items-center gap-3">
              <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
              <span className="text-zinc-900">
                <span className="text-base font-medium">{pinnedCount}</span>{" "}
                <span className="font-mono text-sm">Pinned Stories</span>
              </span>
            </div>
            <span className="font-mono text-sm text-indigo-600 inline-flex items-center gap-1 opacity-60">
              View <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>

          {/* Public Stories — gradient, unclickable for now */}
          <div className="bg-gradient-to-br from-fuchsia-600 via-pink-500 to-red-500 rounded-xl p-6 text-white relative overflow-hidden">
            <Search className="w-6 h-6" strokeWidth={1.5} />
            <h2 className="text-3xl font-medium mt-8">
              {publicCount.toLocaleString()} Public Stories
            </h2>
            <p className="font-mono text-xs text-white/95 mt-2">
              Ready to be viewed and used for your own analysis
            </p>
            <span className="font-mono text-sm absolute right-6 bottom-6 inline-flex items-center gap-1 opacity-90">
              Explore <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-5xl mx-auto px-8 py-5">
        <div className="flex items-center justify-center gap-6 font-mono text-sm">
          <Link
            href="/about"
            className="text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1.5"
          >
            About Cue Count <ExternalLink className="w-3.5 h-3.5" />
          </Link>
          <Link
            href="/support"
            className="text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1.5"
          >
            Support <LifeBuoy className="w-3.5 h-3.5" />
          </Link>
          <span className="text-zinc-600">Cue Count LLC</span>
        </div>
      </footer>

      {/* Perspectives modal */}
      {perspectivesOpen && (
        <Modal
          title="Perspectives"
          onClose={() => setPerspectivesOpen(false)}
        >
          {perspectivesLoading ? (
            <div className="flex items-center justify-center h-32 text-zinc-400 text-sm">
              Loading perspectives...
            </div>
          ) : perspectives.length > 0 ? (
            <div className="flex flex-col">
              {perspectives.map((p) => (
                <HorizontalCard
                  key={p.id}
                  type="perspective"
                  data={p}
                  href={`/perspective/${p.id}`}
                />
              ))}
            </div>
          ) : (
            <div className="text-zinc-400 text-sm py-8 text-center">
              No perspectives found.
            </div>
          )}
        </Modal>
      )}

      {/* Linked Stories modal */}
      {linkedOpen && (
        <Modal title="Linked Stories" onClose={() => setLinkedOpen(false)}>
          {linkedLoading ? (
            <div className="flex items-center justify-center h-32 text-zinc-400 text-sm">
              Loading linked stories...
            </div>
          ) : linkedStories.length > 0 ? (
            <div className="flex flex-col">
              {linkedStories.map((s) => (
                <HorizontalCard
                  key={s.id}
                  type="story"
                  data={s}
                  href={`/story/${s.id}`}
                />
              ))}
            </div>
          ) : (
            <div className="text-zinc-400 text-sm py-8 text-center">
              No linked stories found.
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

function CardButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="text-left bg-zinc-50 hover:bg-zinc-100 transition rounded-xl p-6 flex flex-col"
    >
      {children}
    </button>
  );
}

function ViewLink() {
  return (
    <span className="font-mono text-sm text-indigo-600 inline-flex items-center gap-1">
      View <ArrowUpRight className="w-3.5 h-3.5" />
    </span>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[80vh] bg-white rounded-2xl shadow-xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
          <h3 className="text-lg font-medium">{title}</h3>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-4 flex-1">{children}</div>
      </div>
    </div>
  );
}

export default function UserPage() {
  return (
    <DataProvider>
      <UserPageInner />
    </DataProvider>
  );
}