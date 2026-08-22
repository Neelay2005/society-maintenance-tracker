"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { ShieldCheck, AlertCircle, Clock, CheckCircle2, Sliders, Bell, RefreshCw, Send } from "lucide-react";

interface StatusHistory {
  id: string;
  previousStatus: string | null;
  newStatus: string;
  notes: string | null;
  createdAt: string;
}

interface Complaint {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  photoUrl: string | null;
  createdAt: string;
  resident: {
    id: string;
    name: string;
    email: string;
    unitNumber: string | null;
  };
  statusHistory: StatusHistory[];
}

export default function AdminDashboard() {
  const { data: session } = useSession();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [overdueThresholdDays, setOverdueThresholdDays] = useState(3);
  const [savingSettings, setSavingSettings] = useState(false);
  
  // Status update modal state
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [newStatus, setNewStatus] = useState<string>("IN_PROGRESS");
  const [notes, setNotes] = useState<string>("");
  const [updating, setUpdating] = useState(false);

  // Notice creation modal state
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [noticeData, setNoticeData] = useState({ title: "", content: "", isImportant: false, isPinned: false });
  const [submittingNotice, setSubmittingNotice] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [compRes, setRes] = await Promise.all([
        fetch("/api/complaints"),
        fetch("/api/settings"),
      ]);

      if (compRes.ok) {
        const d = await compRes.json();
        setComplaints(d.complaints || []);
      }
      if (setRes.ok) {
        const s = await setRes.json();
        if (s.settings?.overdueThresholdDays) {
          setOverdueThresholdDays(s.settings.overdueThresholdDays);
        }
      }
    } catch (err) {
      console.error("Failed to fetch admin data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    setUpdating(true);

    try {
      const res = await fetch(`/api/complaints/${selectedComplaint.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, notes }),
      });

      if (res.ok) {
        setSelectedComplaint(null);
        setNotes("");
        fetchData();
      }
    } catch (err) {
      console.error("Error updating status:", err);
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overdueThresholdDays }),
      });
      if (res.ok) {
        alert("Overdue threshold settings updated!");
      }
    } catch (err) {
      console.error("Error saving settings:", err);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingNotice(true);
    try {
      const res = await fetch("/api/notices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(noticeData),
      });
      if (res.ok) {
        setShowNoticeModal(false);
        setNoticeData({ title: "", content: "", isImportant: false, isPinned: false });
        alert("Society Notice published!");
      }
    } catch (err) {
      console.error("Error creating notice:", err);
    } finally {
      setSubmittingNotice(false);
    }
  };

  const isOverdue = (createdAtStr: string, status: string) => {
    if (status === "RESOLVED" || status === "CLOSED") return false;
    const created = new Date(createdAtStr).getTime();
    const now = new Date().getTime();
    const diffDays = (now - created) / (1000 * 3600 * 24);
    return diffDays > overdueThresholdDays;
  };

  const openCount = complaints.filter((c) => c.status === "OPEN").length;
  const inProgressCount = complaints.filter((c) => c.status === "IN_PROGRESS").length;
  const overdueCount = complaints.filter((c) => isOverdue(c.createdAt, c.status)).length;

  return (
    <div className="space-y-8">
      {/* Admin Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-sm">
        <div>
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-xs uppercase font-bold tracking-wider text-emerald-400">Admin Control Desk</span>
          </div>
          <h1 className="text-2xl font-bold text-white mt-1">Society Complaints & Operations</h1>
          <p className="text-sm text-slate-400">Full visibility and management of all resident issues.</p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowNoticeModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-xl shadow-lg transition-all"
          >
            <Bell className="w-4 h-4" />
            <span>Create Notice</span>
          </button>
          <button
            onClick={fetchData}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-all"
            title="Refresh Complaints"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Open Complaints</span>
            <div className="text-3xl font-bold text-amber-400 mt-1">{openCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">In Progress</span>
            <div className="text-3xl font-bold text-sky-400 mt-1">{inProgressCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <RefreshCw className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Overdue (Threshold: {overdueThresholdDays}d)</span>
            <div className="text-3xl font-bold text-rose-400 mt-1">{overdueCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Settings Bar */}
      <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Sliders className="w-4 h-4 text-indigo-400" />
          <span className="text-sm text-slate-300 font-medium">Overdue Threshold Configuration:</span>
          <input
            type="number"
            min={1}
            max={30}
            value={overdueThresholdDays}
            onChange={(e) => setOverdueThresholdDays(Number(e.target.value))}
            className="w-16 px-2.5 py-1 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-sm text-center"
          />
          <span className="text-xs text-slate-400">days</span>
        </div>
        <button
          onClick={handleSaveSettings}
          disabled={savingSettings}
          className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 rounded-lg border border-slate-700 transition-all self-start sm:self-auto"
        >
          {savingSettings ? "Saving..." : "Update Threshold"}
        </button>
      </div>

      {/* All Complaints Desk */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white flex items-center space-x-2">
          <span>All Society Complaints ({complaints.length})</span>
        </h2>

        {loading ? (
          <div className="p-8 text-center text-slate-500 text-sm">Loading complaints data...</div>
        ) : complaints.length === 0 ? (
          <div className="p-8 text-center bg-slate-900/40 rounded-2xl border border-slate-800 text-slate-400">
            No complaints logged in system.
          </div>
        ) : (
          <div className="grid gap-4">
            {complaints.map((c) => {
              const overdue = isOverdue(c.createdAt, c.status);
              return (
                <div
                  key={c.id}
                  className={`bg-slate-900/80 border rounded-2xl p-6 transition-all space-y-4 ${
                    overdue ? "border-rose-500/50 bg-rose-950/10 shadow-lg shadow-rose-950/20" : "border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-semibold text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
                          {c.category}
                        </span>
                        {overdue && (
                          <span className="text-xs font-bold text-rose-400 bg-rose-500/20 px-2.5 py-0.5 rounded-full border border-rose-500/30 flex items-center space-x-1">
                            <AlertCircle className="w-3 h-3" />
                            <span>OVERDUE</span>
                          </span>
                        )}
                        <span className="text-xs text-slate-400">
                          Resident: <strong>{c.resident?.name}</strong> (Unit: {c.resident?.unitNumber || "N/A"})
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-white mt-1">{c.title}</h3>
                    </div>

                    <div className="flex items-center space-x-3 self-start sm:self-auto">
                      <span className="text-xs text-slate-400 uppercase font-bold">{c.status.replace("_", " ")}</span>
                      <button
                        onClick={() => {
                          setSelectedComplaint(c);
                          setNewStatus(c.status);
                        }}
                        className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-semibold rounded-lg border border-indigo-500/30 transition-all"
                      >
                        Update Status
                      </button>
                    </div>
                  </div>

                  <p className="text-sm text-slate-300">{c.description}</p>

                  {/* History Timeline */}
                  {c.statusHistory && c.statusHistory.length > 0 && (
                    <div className="pt-2">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">History Entries ({c.statusHistory.length})</span>
                      <div className="space-y-1 pl-3 border-l-2 border-slate-800 text-xs">
                        {c.statusHistory.map((h) => (
                          <div key={h.id} className="text-slate-400">
                            <span className="font-semibold text-slate-200">{h.newStatus}</span>
                            {h.notes && <span> — &quot;{h.notes}&quot;</span>}
                            <span className="text-[11px] text-slate-500 ml-2">({new Date(h.createdAt).toLocaleDateString()})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Status Update Modal */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Update Complaint Status</h3>
              <button onClick={() => setSelectedComplaint(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleUpdateStatus} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Select New Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                >
                  <option value="OPEN">OPEN</option>
                  <option value="IN_PROGRESS">IN PROGRESS</option>
                  <option value="RESOLVED">RESOLVED</option>
                  <option value="CLOSED">CLOSED</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Status Change Notes
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Assigned technician to repair pipe. Estimated fix: 2 hours."
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedComplaint(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-sm font-medium hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-500 shadow-md"
                >
                  {updating ? "Saving..." : "Save Status"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Notice Creation Modal */}
      {showNoticeModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Create Society Notice</h3>
              <button onClick={() => setShowNoticeModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateNotice} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Notice Title
                </label>
                <input
                  type="text"
                  required
                  value={noticeData.title}
                  onChange={(e) => setNoticeData({ ...noticeData, title: e.target.value })}
                  placeholder="e.g. Scheduled Water Tank Cleaning"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Content / Announcement
                </label>
                <textarea
                  required
                  rows={3}
                  value={noticeData.content}
                  onChange={(e) => setNoticeData({ ...noticeData, content: e.target.value })}
                  placeholder="Details of announcement..."
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none"
                />
              </div>

              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={noticeData.isImportant}
                    onChange={(e) => setNoticeData({ ...noticeData, isImportant: e.target.checked })}
                    className="rounded border-slate-800 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Mark Important</span>
                </label>

                <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={noticeData.isPinned}
                    onChange={(e) => setNoticeData({ ...noticeData, isPinned: e.target.checked })}
                    className="rounded border-slate-800 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Pin to Top</span>
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNoticeModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-sm font-medium hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingNotice}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-500 shadow-md flex items-center space-x-1"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submittingNotice ? "Publishing..." : "Publish Notice"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
