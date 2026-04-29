// components/StoryPermissionsModal.tsx
"use client";

import { useState, useEffect } from "react";
import {
  ArrowLeft, HelpCircle, User, Link2, Lock, MoreHorizontal,
  Save, Copy, Check, Users, ArrowRight, Share2,
} from "lucide-react";
import {
  updateStoryVisibility,
  addViewerEmail,
  removeViewerEmail,
  getStoryShareLink,
  isValidEmail,
  MAX_VIEWERS,
  type StoryVisibility,
  type ViewersMap,
} from "@/lib/permissions";

type Props = {
  storyId:           string;
  storyName:         string;
  currentVisibility: StoryVisibility;
  viewers:           ViewersMap;
  onClose:           () => void;
};

type View = "main" | "viewers" | "share";

export default function StoryPermissionsModal({
  storyId, storyName, currentVisibility, viewers, onClose,
}: Props) {
  const [view,             setView]             = useState<View>("main");
  const [stagedVisibility, setStagedVisibility] = useState<StoryVisibility>(currentVisibility);
  const [saving,           setSaving]           = useState(false);

  useEffect(() => { setStagedVisibility(currentVisibility); }, [currentVisibility]);

  async function handleSave() {
    if (stagedVisibility === currentVisibility) { onClose(); return; }
    setSaving(true);
    try {
      await updateStoryVisibility(storyId, stagedVisibility);
      onClose();
    } catch (err) {
      console.error("[StoryPermissionsModal] save failed:", err);
      alert("Failed to save permissions. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"
      onClick={onClose}
    >
      <div
        className="w-[480px] max-h-[85vh] overflow-y-auto rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {view === "main" && (
          <MainView
            stagedVisibility={stagedVisibility}
            setStagedVisibility={setStagedVisibility}
            viewers={viewers}
            onClose={onClose}
            onOpenViewers={() => setView("viewers")}
            onOpenShare={() => setView("share")}
            onSave={handleSave}
            saving={saving}
          />
        )}
        {view === "viewers" && (
          <ViewersView
            storyId={storyId}
            viewers={viewers}
            onBack={() => setView("main")}
            onOpenShare={() => setView("share")}
          />
        )}
        {view === "share" && (
          <ShareView
            storyId={storyId}
            onBack={() => setView("main")}
          />
        )}
      </div>
    </div>
  );
}

// ─── Main view ──────────────────────────────────────────────────────────────

function MainView({
  stagedVisibility, setStagedVisibility, viewers,
  onClose, onOpenViewers, onOpenShare, onSave, saving,
}: {
  stagedVisibility:    StoryVisibility;
  setStagedVisibility: (v: StoryVisibility) => void;
  viewers:             ViewersMap;
  onClose:             () => void;
  onOpenViewers:       () => void;
  onOpenShare:         () => void;
  onSave:              () => void;
  saving:              boolean;
}) {
  const showViewersRow = stagedVisibility === "private";
  const viewerCount    = Object.keys(viewers ?? {}).length;

  return (
    <>
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
        <button onClick={onClose} className="text-zinc-600 hover:text-zinc-900">
          <ArrowLeft size={18} />
        </button>
        <h2 className="text-base font-medium text-zinc-900">Story Permissions</h2>
        <button className="text-zinc-400 hover:text-zinc-600">
          <HelpCircle size={18} />
        </button>
      </div>

      <div className="px-6 py-4 space-y-2">
        <VisibilityOption
          icon={<User size={18} />}
          title="Publicly Visible"
          description="Anyone with the link can see this story, but cannot use it as a contributor in their own."
          selected={stagedVisibility === "public_visible"}
          onClick={() => setStagedVisibility("public_visible")}
        />
        <VisibilityOption
          icon={<Link2 size={18} />}
          title="Publicly Visible + Usable"
          description="Anyone with the link can see this story and use it as a contributor in their own."
          selected={stagedVisibility === "public_usable"}
          onClick={() => setStagedVisibility("public_usable")}
        />
        <VisibilityOption
          icon={<Lock size={18} />}
          title="Private"
          description="Only you and people you designate by email can see this story."
          selected={stagedVisibility === "private"}
          onClick={() => setStagedVisibility("private")}
        />

        {/* Designated Viewers row — only shown when Private is staged */}
        {showViewersRow && (
          <button
            onClick={onOpenViewers}
            className="w-full flex items-center gap-3 px-3 py-3 mt-2 rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors text-left"
          >
            <Users size={18} className="text-zinc-700" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-zinc-900">Designated Viewers</div>
              <div className="text-xs text-zinc-500 mt-0.5">({viewerCount}/{MAX_VIEWERS} Allowed)</div>
            </div>
            <ArrowRight size={16} className="text-zinc-600" />
          </button>
        )}
      </div>

      <div className="flex items-center justify-between px-6 py-4 mt-2 border-t border-zinc-100">
        <button
          onClick={onOpenShare}
          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Share Story Link <Share2 size={14} />
        </button>
        <button
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"} <Save size={14} />
        </button>
      </div>
    </>
  );
}

// ─── Designated Viewers view ────────────────────────────────────────────────

function ViewersView({
  storyId, viewers, onBack, onOpenShare,
}: {
  storyId:     string;
  viewers:     ViewersMap;
  onBack:      () => void;
  onOpenShare: () => void;
}) {
  const [newEmail, setNewEmail] = useState("");
  const [adding,   setAdding]   = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const entries = Object.entries(viewers ?? {});

  async function handleAdd() {
    if (!newEmail.trim() || adding) return;
    setError(null);
    setAdding(true);
    try {
      await addViewerEmail(storyId, newEmail);
      setNewEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add viewer");
    } finally {
      setAdding(false);
    }
  }

  return (
    <>
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
        <button onClick={onBack} className="text-zinc-600 hover:text-zinc-900">
          <ArrowLeft size={18} />
        </button>
        <h2 className="text-base font-medium text-zinc-900">
          Designated Viewers ({entries.length}/{MAX_VIEWERS})
        </h2>
        <button className="text-zinc-400 hover:text-zinc-600">
          <HelpCircle size={18} />
        </button>
      </div>

      <div className="px-6 py-4 space-y-2">
        {entries.length === 0 ? (
          <div className="text-center text-sm text-zinc-400 py-3">
            No designated viewers yet.
          </div>
        ) : (
          entries.map(([email, entry]) => {
            const display     = (typeof entry?.name === "string" && entry.name.trim()) || "Pending";
            const initial     = display === "Pending" ? "·" : display[0].toUpperCase();
            return (
              <ViewerRow
                key={email}
                initial={initial}
                primary={display}
                secondary={email}
                onRemove={async () => {
                  if (confirm(`Remove ${email} as a viewer?`)) {
                    await removeViewerEmail(storyId, email);
                  }
                }}
              />
            );
          })
        )}

        {/* Add new email row */}
        <div className="pt-2">
          <label className="block">
            <span className="block text-xs text-zinc-500 mb-1">New Viewer Email</span>
            <div className="flex items-center gap-2 border-b border-zinc-300 focus-within:border-blue-500 transition-colors">
              <input
                type="email"
                value={newEmail}
                onChange={(e) => { setNewEmail(e.target.value); setError(null); }}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } }}
                placeholder="name@example.com"
                disabled={adding || entries.length >= MAX_VIEWERS}
                className="flex-1 py-2 text-sm text-zinc-900 outline-none bg-transparent disabled:opacity-50"
              />
              <button
                onClick={handleAdd}
                disabled={!newEmail.trim() || adding || !isValidEmail(newEmail.trim().toLowerCase())}
                className="text-blue-600 hover:text-blue-700 disabled:opacity-30 disabled:cursor-not-allowed p-1"
                title="Add viewer"
              >
                <Check size={18} />
              </button>
            </div>
          </label>
          {error && <div className="text-xs text-red-600 mt-2">{error}</div>}
        </div>
      </div>

      <div className="flex items-center justify-start px-6 py-4 mt-2 border-t border-zinc-100">
        <button
          onClick={onOpenShare}
          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Share Story Link <Share2 size={14} />
        </button>
      </div>
    </>
  );
}

// ─── Share view ─────────────────────────────────────────────────────────────

function ShareView({
  storyId, onBack,
}: {
  storyId: string;
  onBack:  () => void;
}) {
  const [copied, setCopied] = useState(false);
  const url = getStoryShareLink(storyId);

  async function handleCopy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <>
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
        <button onClick={onBack} className="text-zinc-600 hover:text-zinc-900">
          <ArrowLeft size={18} />
        </button>
        <h2 className="text-base font-medium text-zinc-900">Share Story</h2>
        <button className="text-zinc-400 hover:text-zinc-600">
          <HelpCircle size={18} />
        </button>
      </div>

      <div className="px-6 py-5">
        <button
          onClick={handleCopy}
          className="w-full flex items-center justify-between gap-3 px-3 py-3 rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors"
        >
          <div className="flex items-center gap-3 min-w-0">
            <Link2 size={16} className="text-zinc-700 flex-shrink-0" />
            <div className="text-left min-w-0">
              <div className="text-sm text-zinc-900">
                {copied ? "Copied!" : "Copy Story Link"}
              </div>
              <div className="text-xs text-zinc-500 truncate">{url}</div>
            </div>
          </div>
          {copied
            ? <Check size={16} className="text-green-600 flex-shrink-0" />
            : <Copy  size={16} className="text-zinc-600 flex-shrink-0" />}
        </button>
      </div>
    </>
  );
}

// ─── Reusable bits ──────────────────────────────────────────────────────────

function VisibilityOption({
  icon, title, description, selected, onClick,
}: {
  icon:        React.ReactNode;
  title:       string;
  description: string;
  selected:    boolean;
  onClick:     () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-start gap-3 px-3 py-3 rounded-lg text-left transition-colors ${
        selected ? "bg-purple-50" : "hover:bg-zinc-50"
      }`}
    >
      <div className="text-zinc-700 mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-zinc-900">{title}</div>
        <div className="text-xs text-zinc-500 mt-0.5">{description}</div>
      </div>
      <div className="mt-1">
        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
          selected ? "border-blue-600" : "border-zinc-300"
        }`}>
          {selected && <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
        </div>
      </div>
    </button>
  );
}

function ViewerRow({
  initial, primary, secondary, onRemove,
}: {
  initial:   string;
  primary:   string;
  secondary: string;
  onRemove:  () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-purple-50/60">
      <div className="w-8 h-8 rounded-full bg-purple-200 flex items-center justify-center text-sm font-medium text-purple-900">
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-zinc-900 truncate">{primary}</div>
        <div className="text-xs text-zinc-500 truncate">{secondary}</div>
      </div>
      <div className="relative">
        <button
          onClick={() => setMenuOpen(o => !o)}
          className="text-blue-600 hover:text-blue-700 p-1"
        >
          <MoreHorizontal size={16} />
        </button>
        {menuOpen && (
          <div
            className="absolute right-0 mt-1 w-36 bg-white border border-zinc-200 rounded-lg shadow-md z-10"
            onMouseLeave={() => setMenuOpen(false)}
          >
            <button
              onClick={() => { setMenuOpen(false); onRemove(); }}
              className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 rounded-lg"
            >
              Remove viewer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}