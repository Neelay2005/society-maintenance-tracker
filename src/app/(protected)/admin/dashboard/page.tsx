"use client";

import { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  AlertCircle,
  Clock,
  Sliders,
  Bell,
  RefreshCw,
  Send,
  Filter,
  AlertTriangle,
  Lock,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";

import { AdminCharts } from "@/components/admin-charts";

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

function AdminDashboardContent() {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // URL query parameter filters
  const currentStatusFilter = searchParams.get("status") || "ALL";
  const currentCategoryFilter = searchParams.get("category") || "ALL";
  const currentPriorityFilter = searchParams.get("priority") || "ALL";

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [overdueThresholdDays, setOverdueThresholdDays] = useState(3);
  const [savingSettings, setSavingSettings] = useState(false);

  // Analytics State
  const [analyticsData, setAnalyticsData] = useState<{
    categoryData: { category: string; count: number }[];
    statusData: { status: string; rawStatus: string; count: number }[];
  } | null>(null);

  // Status/Priority update modal state
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [newStatus, setNewStatus] = useState<string>("IN_PROGRESS");
  const [newPriority, setNewPriority] = useState<string>("MEDIUM");
  const [notes, setNotes] = useState<string>("");
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Notice creation modal state
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [noticeData, setNoticeData] = useState({
    title: "",
    content: "",
    isImportant: false,
    isPinned: false,
  });
  const [submittingNotice, setSubmittingNotice] = useState(false);

  const updateFilters = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "ALL") {
      params.set(key, value.toLowerCase());
    } else {
      params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const queryStr = searchParams.toString();
      const apiUrl = queryStr ? `/api/complaints?${queryStr}` : "/api/complaints";

      const [compRes, setRes, analyticsRes] = await Promise.all([
        fetch(apiUrl),
        fetch("/api/settings"),
        fetch("/api/admin/analytics"),
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
      if (analyticsRes.ok) {
        const a = await analyticsRes.json();
        setAnalyticsData({
          categoryData: a.categoryData || [],
          statusData: a.statusData || [],
        });
      }
    } catch (err) {
      console.error("Failed to fetch admin data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [searchParams]);

  const handleUpdateStatusAndPriority = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    setUpdating(true);
    setUpdateError(null);

    try {
      const res = await fetch(`/api/complaints/${selectedComplaint.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          priority: newPriority,
          notes,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSelectedComplaint(null);
        setNotes("");
        fetchData();
      } else {
        setUpdateError(data.error || "Failed to update complaint");
      }
    } catch (err) {
      console.error("Error updating complaint:", err);
      setUpdateError("Unexpected network error occurred.");
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
        alert("Overdue threshold settings updated successfully!");
        fetchData();
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

  const getComplaintAgeDays = (createdAtStr: string) => {
    const created = new Date(createdAtStr).getTime();
    const now = new Date().getTime();
    return Math.floor((now - created) / (1000 * 3600 * 24));
  };

  const isOverdue = (createdAtStr: string, status: string) => {
    if (status === "RESOLVED" || status === "CLOSED") return false;
    const diffDays = getComplaintAgeDays(createdAtStr);
    return diffDays >= overdueThresholdDays;
  };

  // Phase 4 requirement: Sort Overdue complaints ABOVE non-overdue complaints!
  const sortedComplaints = [...complaints].sort((a, b) => {
    const aOverdue = isOverdue(a.createdAt, a.status);
    const bOverdue = isOverdue(b.createdAt, b.status);

    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;

    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const openCount = complaints.filter((c) => c.status === "OPEN").length;
  const inProgressCount = complaints.filter((c) => c.status === "IN_PROGRESS").length;
  const overdueCount = complaints.filter((c) => isOverdue(c.createdAt, c.status)).length;

  return (
    <div className="space-y-8">
      {/* Admin Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-sm">
        <div>
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-xs uppercase font-bold tracking-wider text-emerald-400">Admin Control Desk</span>
          </div>
          <h1 className="text-2xl font-bold text-white mt-1">Society Complaints & Operations</h1>
          <p className="text-sm text-slate-400">Full visibility, filterable complaint tracking, and overdue SLA monitoring.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/admin/settings"
            className="flex items-center space-x-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-xl border border-slate-700 transition-all"
          >
            <Sliders className="w-4 h-4 text-indigo-400" />
            <span>Settings</span>
          </Link>
          <button
            onClick={() => setShowNoticeModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-sm rounded-xl shadow-lg transition-all"
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
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Recharts Analytics Section */}
      {analyticsData && (
        <AdminCharts
          categoryData={analyticsData.categoryData}
          statusData={analyticsData.statusData}
        />
      )}

      {/* URL Query Parameters Filter Bar */}
      <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs uppercase font-bold tracking-wider text-indigo-400">
            <Filter className="w-4 h-4" />
            <span>Bookmarkable Filters (URL Query Parameters)</span>
          </div>
          {(currentStatusFilter !== "ALL" || currentCategoryFilter !== "ALL" || currentPriorityFilter !== "ALL") && (
            <button
              onClick={() => router.push(pathname)}
              className="text-xs text-slate-400 hover:text-white underline font-medium"
            >
              Reset Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Status Filter</label>
            <select
              value={currentStatusFilter.toUpperCase()}
              onChange={(e) => updateFilters("status", e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">OPEN</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="RESOLVED">RESOLVED</option>
              <option value="CLOSED">CLOSED</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Category Filter</label>
            <select
              value={currentCategoryFilter.toUpperCase()}
              onChange={(e) => updateFilters("category", e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Categories</option>
              <option value="PLUMBING">Plumbing</option>
              <option value="ELECTRICAL">Electrical</option>
              <option value="CLEANING">Cleaning</option>
              <option value="SECURITY">Security</option>
              <option value="NOISE">Noise</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Priority Filter</label>
            <select
              value={currentPriorityFilter.toUpperCase()}
              onChange={(e) => updateFilters("priority", e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Priorities</option>
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
            </select>
          </div>
        </div>
      </div>

      {/* Complaints List sorted with OVERDUE FIRST */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white flex items-center justify-between">
          <span>All Society Complaints ({sortedComplaints.length})</span>
          <span className="text-xs text-slate-400 font-normal">Sorted: Overdue complaints top priority</span>
        </h2>

        {loading ? (
          <div className="p-8 text-center text-slate-500 text-sm">Loading complaints data...</div>
        ) : sortedComplaints.length === 0 ? (
          <div className="p-12 text-center bg-slate-900/40 rounded-2xl border border-slate-800 text-slate-400 space-y-2">
            <CheckCircle2 className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-sm font-medium text-slate-300">No complaints match your current filter parameters.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {sortedComplaints.map((c) => {
              const overdue = isOverdue(c.createdAt, c.status);
              const ageDays = getComplaintAgeDays(c.createdAt);
              const isReadOnly = c.status === "RESOLVED" || c.status === "CLOSED";

              return (
                <div
                  key={c.id}
                  className={`bg-slate-900/80 border rounded-2xl p-6 transition-all space-y-4 ${
                    overdue
                      ? "border-rose-500/60 bg-rose-950/15 shadow-xl shadow-rose-950/30"
                      : "border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-xs font-mono font-bold text-slate-400 bg-slate-800 px-2.5 py-0.5 rounded-lg border border-slate-700">
                          #{c.id.slice(-6).toUpperCase()}
                        </span>
                        <span className="text-xs font-semibold text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
                          {c.category}
                        </span>
                        <span className="text-[11px] font-semibold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                          {c.priority} PRIORITY
                        </span>
                        {overdue && (
                          <span className="text-xs font-bold text-rose-400 bg-rose-500/20 px-2.5 py-0.5 rounded-full border border-rose-500/40 flex items-center space-x-1 animate-pulse">
                            <AlertTriangle className="w-3 h-3" />
                            <span>OVERDUE (Open for {ageDays} {ageDays === 1 ? "day" : "days"})</span>
                          </span>
                        )}
                        <span className="text-xs text-slate-400">
                          Resident: <strong className="text-slate-200">{c.resident?.name}</strong> (Unit: {c.resident?.unitNumber || "N/A"})
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-white">{c.title}</h3>
                    </div>

                    <div className="flex items-center space-x-3 self-start sm:self-auto">
                      <span className="text-xs px-3 py-1 rounded-full border font-bold uppercase tracking-wider bg-slate-800 text-slate-200 border-slate-700">
                        {c.status.replace("_", " ")}
                      </span>

                      {isReadOnly ? (
                        <span className="flex items-center space-x-1 px-3 py-1.5 bg-slate-800 text-slate-500 text-xs font-semibold rounded-lg border border-slate-700/60 cursor-not-allowed">
                          <Lock className="w-3.5 h-3.5" />
                          <span>Resolved (Read-only)</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedComplaint(c);
                            setNewStatus(c.status);
                            setNewPriority(c.priority);
                            setUpdateError(null);
                          }}
                          className="px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-semibold rounded-lg shadow-md transition-all"
                        >
                          Manage Workflow
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-slate-300 leading-relaxed">{c.description}</p>

                  {c.photoUrl && (
                    <div className="pt-1">
                      <a
                        href={c.photoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center space-x-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-medium bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>View Attached Photo</span>
                      </a>
                    </div>
                  )}

                  {/* Status History Audit Timeline */}
                  {c.statusHistory && c.statusHistory.length > 0 && (
                    <div className="pt-2">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                        Status History Audit ({c.statusHistory.length})
                      </span>
                      <div className="space-y-1.5 pl-3 border-l-2 border-slate-800 text-xs">
                        {c.statusHistory.map((h) => (
                          <div key={h.id} className="text-slate-400">
                            <span className="font-bold text-slate-200">{h.newStatus}</span>
                            {h.notes && <span> — &quot;{h.notes}&quot;</span>}
                            <span className="text-[11px] text-slate-500 ml-2">
                              ({new Date(h.createdAt).toLocaleString()})
                            </span>
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

      {/* Status & Priority Update Modal */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Manage Complaint Lifecycle</h3>
              <button onClick={() => setSelectedComplaint(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            {updateError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start space-x-2 text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{updateError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateStatusAndPriority} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Change Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                >
                  <option value="OPEN">OPEN</option>
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="RESOLVED">RESOLVED</option>
                  <option value="CLOSED">CLOSED</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Change Priority
                </label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Status Change Audit Note (Optional)
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Electrician assigned. Technician visiting tomorrow at 10 AM."
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
                  className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl text-sm font-semibold shadow-md"
                >
                  {updating ? "Saving Update..." : "Update Workflow"}
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

export default function AdminDashboard() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500 text-sm">Loading Admin Dashboard...</div>}>
      <AdminDashboardContent />
    </Suspense>
  );
}
