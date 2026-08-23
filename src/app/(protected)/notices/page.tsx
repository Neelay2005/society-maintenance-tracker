"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Bell,
  Plus,
  AlertTriangle,
  Pin,
  Clock,
  Trash2,
  Edit2,
  ShieldCheck,
  CheckCircle2,
  X,
  Send,
  MessageSquare,
} from "lucide-react";

interface Notice {
  id: string;
  title: string;
  content: string;
  isImportant: boolean;
  isPinned: boolean;
  createdAt: string;
  createdBy?: {
    name: string;
    email: string;
  };
}

export default function NoticeBoardPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    content: "",
    isImportant: false,
    isPinned: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchNotices = async () => {
    try {
      const res = await fetch("/api/notices");
      if (res.ok) {
        const data = await res.json();
        setNotices(data.notices || []);
      }
    } catch (err) {
      console.error("Error fetching notices:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch("/api/notices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || "Failed to create notice");
      } else {
        setShowCreateModal(false);
        setFormData({ title: "", content: "", isImportant: false, isPinned: false });
        fetchNotices();
      }
    } catch (err) {
      setFormError("Unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNotice) return;
    setSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch(`/api/notices/${editingNotice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || "Failed to update notice");
      } else {
        setEditingNotice(null);
        setFormData({ title: "", content: "", isImportant: false, isPinned: false });
        fetchNotices();
      }
    } catch (err) {
      setFormError("Unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteNotice = async (id: string) => {
    if (!confirm("Are you sure you want to delete this notice?")) return;

    try {
      const res = await fetch(`/api/notices/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchNotices();
      } else {
        alert("Failed to delete notice");
      }
    } catch (err) {
      console.error("Error deleting notice:", err);
    }
  };

  const openEditModal = (notice: Notice) => {
    setEditingNotice(notice);
    setFormData({
      title: notice.title,
      content: notice.content,
      isImportant: notice.isImportant,
      isPinned: notice.isPinned,
    });
    setFormError(null);
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-sm">
        <div>
          <div className="flex items-center space-x-2">
            <Bell className="w-4 h-4 text-indigo-400" />
            <span className="text-xs uppercase font-bold tracking-wider text-indigo-400">Society Notice Board</span>
          </div>
          <h1 className="text-2xl font-bold text-white mt-1">Announcements & Updates</h1>
          <p className="text-sm text-slate-400">Important society-wide notices sorted with priority alerts first.</p>
        </div>

        {isAdmin && (
          <button
            onClick={() => {
              setFormData({ title: "", content: "", isImportant: false, isPinned: false });
              setFormError(null);
              setShowCreateModal(true);
            }}
            className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-sm rounded-xl shadow-lg transition-all self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Post New Notice</span>
          </button>
        )}
      </div>

      {/* Notices List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white flex items-center space-x-2">
          <MessageSquare className="w-5 h-5 text-indigo-400" />
          <span>Active Announcements ({notices.length})</span>
        </h2>

        {loading ? (
          <div className="p-8 text-center text-slate-500 text-sm">Loading notice board...</div>
        ) : notices.length === 0 ? (
          <div className="p-12 text-center bg-slate-900/40 rounded-2xl border border-slate-800 text-slate-400 space-y-3">
            <CheckCircle2 className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-base font-medium text-slate-300">No notices posted yet</p>
            <p className="text-xs text-slate-500">Check back later for society management updates.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {notices.map((n) => (
              <div
                key={n.id}
                className={`bg-slate-900/80 border rounded-2xl p-6 transition-all space-y-4 ${
                  n.isImportant
                    ? "border-rose-500/50 bg-rose-950/10 shadow-xl shadow-rose-950/20"
                    : n.isPinned
                    ? "border-indigo-500/50 bg-indigo-950/10"
                    : "border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {n.isImportant && (
                      <span className="text-xs font-bold text-rose-400 bg-rose-500/20 px-2.5 py-0.5 rounded-full border border-rose-500/30 flex items-center space-x-1 animate-pulse">
                        <AlertTriangle className="w-3 h-3" />
                        <span>IMPORTANT</span>
                      </span>
                    )}
                    {n.isPinned && (
                      <span className="text-xs font-bold text-indigo-300 bg-indigo-500/20 px-2.5 py-0.5 rounded-full border border-indigo-500/30 flex items-center space-x-1">
                        <Pin className="w-3 h-3 text-indigo-400" />
                        <span>PINNED</span>
                      </span>
                    )}
                    <span className="text-xs text-slate-400 flex items-center space-x-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>{new Date(n.createdAt).toLocaleDateString()}</span>
                    </span>
                  </div>

                  {isAdmin && (
                    <div className="flex items-center space-x-2 self-end sm:self-auto">
                      <button
                        onClick={() => openEditModal(n)}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors"
                        title="Edit Notice"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteNotice(n.id)}
                        className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg border border-rose-500/30 transition-colors"
                        title="Delete Notice"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-xl font-bold text-white mb-2">{n.title}</h3>
                  <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{n.content}</p>
                </div>

                <div className="text-[11px] text-slate-500 pt-1">
                  Posted by: <strong className="text-slate-400">{n.createdBy?.name || "Society Management"}</strong>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Notice Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Post New Society Notice</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateNotice} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Notice Title
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Annual Society Meeting Announcement"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Content / Announcement
                </label>
                <textarea
                  required
                  rows={4}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Provide full details of announcement..."
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center space-x-6 pt-1">
                <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isImportant}
                    onChange={(e) => setFormData({ ...formData, isImportant: e.target.checked })}
                    className="rounded border-slate-800 text-rose-600 focus:ring-rose-500"
                  />
                  <span className="font-semibold text-rose-400">Mark Important (Sends Email Alert)</span>
                </label>

                <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isPinned}
                    onChange={(e) => setFormData({ ...formData, isPinned: e.target.checked })}
                    className="rounded border-slate-800 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Pin to Top</span>
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-sm font-medium hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-md flex items-center space-x-1.5"
                >
                  <Send className="w-4 h-4" />
                  <span>{submitting ? "Posting..." : "Publish Notice"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Notice Modal */}
      {editingNotice && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Edit Society Notice</h3>
              <button onClick={() => setEditingNotice(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleUpdateNotice} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Notice Title
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Content / Announcement
                </label>
                <textarea
                  required
                  rows={4}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center space-x-6 pt-1">
                <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isImportant}
                    onChange={(e) => setFormData({ ...formData, isImportant: e.target.checked })}
                    className="rounded border-slate-800 text-rose-600 focus:ring-rose-500"
                  />
                  <span className="font-semibold text-rose-400">Mark Important</span>
                </label>

                <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isPinned}
                    onChange={(e) => setFormData({ ...formData, isPinned: e.target.checked })}
                    className="rounded border-slate-800 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Pin to Top</span>
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingNotice(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-sm font-medium hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-md"
                >
                  {submitting ? "Saving..." : "Save Notice"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
