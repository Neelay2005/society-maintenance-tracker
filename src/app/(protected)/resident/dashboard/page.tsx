"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Plus,
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Send,
  Upload,
  X,
  Tag,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
} from "lucide-react";

interface StatusHistory {
  id: string;
  previousStatus: string | null;
  newStatus: string;
  notes: string | null;
  createdAt: string;
  changedBy?: {
    name: string;
    role: string;
  };
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
  statusHistory: StatusHistory[];
}

export default function ResidentDashboard() {
  const { data: session } = useSession();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [overdueThresholdDays, setOverdueThresholdDays] = useState(3);
  
  // Complaint creation state
  const [showNewModal, setShowNewModal] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "PLUMBING",
    priority: "MEDIUM",
    photoUrl: "",
  });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Selected complaint details modal state
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);

  const fetchComplaints = async () => {
    try {
      const [compRes, setRes] = await Promise.all([
        fetch("/api/complaints/mine"),
        fetch("/api/settings"),
      ]);

      if (compRes.ok) {
        const data = await compRes.json();
        setComplaints(data.complaints || []);
      }

      if (setRes.ok) {
        const sData = await setRes.json();
        if (sData.settings?.overdueThresholdDays) {
          setOverdueThresholdDays(sData.settings.overdueThresholdDays);
        }
      }
    } catch (e) {
      console.error("Failed to load resident complaints:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    setUploadError(null);

    const uploadFormData = new FormData();
    uploadFormData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: uploadFormData,
      });

      const data = await res.json();

      if (!res.ok) {
        setUploadError(data.error || "Failed to upload photo");
      } else {
        setFormData({ ...formData, photoUrl: data.photoUrl });
      }
    } catch (err) {
      setUploadError("Network error during photo upload");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || "Failed to submit complaint");
      } else {
        setFormData({
          title: "",
          description: "",
          category: "PLUMBING",
          priority: "MEDIUM",
          photoUrl: "",
        });
        setShowNewModal(false);
        fetchComplaints();
      }
    } catch (err) {
      setFormError("An unexpected error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const fetchComplaintDetails = async (id: string) => {
    try {
      const res = await fetch(`/api/complaints/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedComplaint(data.complaint);
      }
    } catch (e) {
      console.error("Error fetching single complaint details:", e);
    }
  };

  const isOverdue = (createdAtStr: string, status: string) => {
    if (status === "RESOLVED" || status === "CLOSED") return false;
    const created = new Date(createdAtStr).getTime();
    const now = new Date().getTime();
    const diffDays = (now - created) / (1000 * 3600 * 24);
    return diffDays > overdueThresholdDays;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "OPEN":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      case "IN_PROGRESS":
        return "bg-sky-500/10 text-sky-400 border-sky-500/30";
      case "RESOLVED":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "CLOSED":
        return "bg-slate-500/10 text-slate-400 border-slate-500/30";
      default:
        return "bg-slate-500/10 text-slate-400 border-slate-500/30";
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "HIGH":
        return "bg-rose-500/10 text-rose-400 border-rose-500/30";
      case "MEDIUM":
        return "bg-amber-500/10 text-amber-300 border-amber-500/30";
      case "LOW":
        return "bg-slate-500/10 text-slate-400 border-slate-500/30";
      default:
        return "bg-slate-500/10 text-slate-400 border-slate-500/30";
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-sm">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs uppercase font-bold tracking-wider text-indigo-400">Resident Portal</span>
            <span className="text-xs text-slate-500">•</span>
            <span className="text-xs text-slate-400">Unit / Flat: {session?.user?.unitNumber || "N/A"}</span>
          </div>
          <h1 className="text-2xl font-bold text-white mt-1">My Complaints & History</h1>
          <p className="text-sm text-slate-400">Submit requests and monitor real-time maintenance progress.</p>
        </div>

        <button
          onClick={() => {
            setFormData({
              title: "",
              description: "",
              category: "PLUMBING",
              priority: "MEDIUM",
              photoUrl: "",
            });
            setFormError(null);
            setUploadError(null);
            setShowNewModal(true);
          }}
          className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-indigo-600/25 transition-all self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Raise New Complaint</span>
        </button>
      </div>

      {/* Role Enforcement & Privacy Notice */}
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex items-center space-x-3 text-xs text-slate-400">
        <ShieldAlert className="w-4 h-4 text-emerald-400 shrink-0" />
        <span>
          <strong>Resident Privacy Policy:</strong> Authenticated as <strong>{session?.user?.name}</strong>. Access is restricted to your own submitted complaints only. Other residents cannot view your requests.
        </span>
      </div>

      {/* Complaints List Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white flex items-center space-x-2">
          <FileText className="w-5 h-5 text-indigo-400" />
          <span>My Complaints ({complaints.length})</span>
        </h2>

        {loading ? (
          <div className="p-8 text-center text-slate-500 text-sm">Loading your complaints...</div>
        ) : complaints.length === 0 ? (
          <div className="p-12 text-center bg-slate-900/40 rounded-2xl border border-slate-800 text-slate-400 space-y-3">
            <CheckCircle2 className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-base font-medium text-slate-300">No complaints submitted yet</p>
            <p className="text-xs text-slate-500">Need maintenance assistance? Click &quot;Raise New Complaint&quot; above.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {complaints.map((c) => {
              const overdue = isOverdue(c.createdAt, c.status);
              return (
                <div
                  key={c.id}
                  onClick={() => fetchComplaintDetails(c.id)}
                  className={`group cursor-pointer bg-slate-900/80 border rounded-2xl p-6 transition-all hover:border-indigo-500/50 hover:bg-slate-900/90 space-y-4 ${
                    overdue ? "border-rose-500/40 bg-rose-950/10" : "border-slate-800"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div className="flex items-center space-x-3">
                      <span className="text-xs font-mono font-bold text-slate-400 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
                        #{c.id.slice(-6).toUpperCase()}
                      </span>
                      <span className="text-xs font-semibold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">
                        {c.category}
                      </span>
                      <span className={`text-[11px] px-2.5 py-0.5 rounded-full border font-semibold ${getPriorityBadge(c.priority)}`}>
                        {c.priority} PRIORITY
                      </span>
                      {overdue && (
                        <span className="text-xs font-bold text-rose-400 bg-rose-500/20 px-2 py-0.5 rounded-full border border-rose-500/30 flex items-center space-x-1">
                          <AlertTriangle className="w-3 h-3" />
                          <span>OVERDUE</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-3">
                      <span className={`text-xs px-3 py-1 rounded-full border font-bold uppercase tracking-wider ${getStatusBadge(c.status)}`}>
                        {c.status.replace("_", " ")}
                      </span>
                      <span className="text-xs text-indigo-400 group-hover:translate-x-0.5 transition-transform flex items-center space-x-1 font-medium">
                        <span>Details</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors">{c.title}</h3>
                    <p className="text-sm text-slate-300 mt-1 line-clamp-2">{c.description}</p>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>Created {new Date(c.createdAt).toLocaleString()}</span>
                    </div>
                    {c.statusHistory && c.statusHistory.length > 0 && (
                      <span className="text-slate-400 font-medium">
                        {c.statusHistory.length} History Entry{c.statusHistory.length > 1 ? "ies" : ""}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Complaint Creation Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">Submit Maintenance Request</h3>
              <button onClick={() => setShowNewModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start space-x-2.5 text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Title / Brief Subject
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Water leakage in bathroom pipe"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value="PLUMBING">Plumbing</option>
                    <option value="ELECTRICAL">Electrical</option>
                    <option value="CLEANING">Cleaning</option>
                    <option value="SECURITY">Security</option>
                    <option value="NOISE">Noise</option>
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Detailed Description
                </label>
                <textarea
                  required
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Provide clear details of the issue, location, and urgency..."
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Photo Upload Input with Server Validation */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Photo Attachment (Optional)
                </label>
                
                {formData.photoUrl ? (
                  <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl">
                    <div className="flex items-center space-x-2 truncate">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="text-xs text-slate-300 truncate">{formData.photoUrl}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, photoUrl: "" })}
                      className="text-xs text-rose-400 hover:text-rose-300 font-medium ml-2"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      disabled={uploadingPhoto}
                      className="hidden"
                      id="photo-upload-input"
                    />
                    <label
                      htmlFor="photo-upload-input"
                      className="flex items-center justify-center space-x-2 p-3 bg-slate-950 border border-dashed border-slate-700 hover:border-indigo-500 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 cursor-pointer transition-all"
                    >
                      <Upload className="w-4 h-4 text-indigo-400" />
                      <span>{uploadingPhoto ? "Validating & Uploading Photo..." : "Choose Image (Max 5MB: JPG, PNG, WEBP)"}</span>
                    </label>
                  </div>
                )}

                {uploadError && (
                  <p className="mt-1.5 text-xs text-rose-400 font-medium">{uploadError}</p>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-sm font-medium hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || uploadingPhoto}
                  className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl text-sm font-semibold shadow-md flex items-center space-x-2 transition-all disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{submitting ? "Submitting..." : "Submit Complaint"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complaint Details Modal with Status History Timeline */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center space-x-2.5 mb-1">
                  <span className="text-xs font-mono font-bold text-slate-400 bg-slate-800 px-2.5 py-0.5 rounded-lg border border-slate-700">
                    #{selectedComplaint.id}
                  </span>
                  <span className="text-xs font-semibold text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
                    {selectedComplaint.category}
                  </span>
                  <span className={`text-[11px] px-2.5 py-0.5 rounded-full border font-semibold ${getPriorityBadge(selectedComplaint.priority)}`}>
                    {selectedComplaint.priority} PRIORITY
                  </span>
                </div>
                <h2 className="text-xl font-bold text-white">{selectedComplaint.title}</h2>
              </div>
              <button
                onClick={() => setSelectedComplaint(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Status Section */}
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Current Status</span>
              <span className={`text-xs px-3.5 py-1 rounded-full border font-bold uppercase tracking-wider ${getStatusBadge(selectedComplaint.status)}`}>
                {selectedComplaint.status.replace("_", " ")}
              </span>
            </div>

            {/* Complaint Description & Photo */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Description</h4>
              <p className="text-sm text-slate-200 leading-relaxed bg-slate-950 p-4 rounded-xl border border-slate-800/80">
                {selectedComplaint.description}
              </p>

              {selectedComplaint.photoUrl && (
                <div className="space-y-2 pt-2">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Attached Photo</h4>
                  <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 p-2 max-w-sm">
                    <a href={selectedComplaint.photoUrl} target="_blank" rel="noreferrer" className="flex items-center space-x-2 text-xs text-indigo-400 hover:text-indigo-300 font-medium p-2">
                      <ExternalLink className="w-4 h-4" />
                      <span>View Full Resolution Image</span>
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Status History Timeline */}
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center space-x-2">
                <Clock className="w-4 h-4 text-indigo-400" />
                <span>Status History Timeline</span>
              </h4>

              {selectedComplaint.statusHistory && selectedComplaint.statusHistory.length > 0 ? (
                <div className="space-y-4 border-l-2 border-slate-800 pl-4 ml-2 pt-1">
                  {selectedComplaint.statusHistory.map((history, idx) => (
                    <div key={history.id} className="relative space-y-1">
                      <div className="absolute -left-[21px] top-1.5 w-3 h-3 rounded-full bg-indigo-500 border-2 border-slate-900" />
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-white">
                          {history.newStatus.replace("_", " ")}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {new Date(history.createdAt).toLocaleString()}
                        </span>
                      </div>
                      {history.notes && (
                        <p className="text-xs text-slate-300 bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/60 italic">
                          &quot;{history.notes}&quot;
                        </p>
                      )}
                      <div className="text-[11px] text-slate-500">
                        Actor: {history.changedBy?.name || "System/Resident"}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">No status history available.</p>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedComplaint(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-xl transition-colors"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
