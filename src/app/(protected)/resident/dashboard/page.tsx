"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Plus, ShieldAlert, Clock, CheckCircle2, AlertTriangle, FileText, Send, Image as ImageIcon } from "lucide-react";

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
  statusHistory: StatusHistory[];
}

export default function ResidentDashboard() {
  const { data: session } = useSession();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "PLUMBING",
    photoUrl: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchComplaints = async () => {
    try {
      const res = await fetch("/api/complaints");
      if (res.ok) {
        const data = await res.json();
        setComplaints(data.complaints || []);
      }
    } catch (e) {
      console.error("Failed to load complaints:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setFormData({ title: "", description: "", category: "PLUMBING", photoUrl: "" });
        setShowNewModal(false);
        fetchComplaints();
      }
    } catch (err) {
      console.error("Error creating complaint:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
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

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-sm">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs uppercase font-bold tracking-wider text-indigo-400">Resident Portal</span>
            <span className="text-xs text-slate-500">•</span>
            <span className="text-xs text-slate-400">Flat: {session?.user?.unitNumber || "N/A"}</span>
          </div>
          <h1 className="text-2xl font-bold text-white mt-1">My Complaints & Service Requests</h1>
          <p className="text-sm text-slate-400">Track real-time status history of your submitted maintenance issues.</p>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center space-x-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-xl shadow-lg shadow-indigo-600/25 transition-all self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Raise New Complaint</span>
        </button>
      </div>

      {/* Access Protection Notice */}
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex items-center space-x-3 text-xs text-slate-400">
        <ShieldAlert className="w-4 h-4 text-emerald-400 shrink-0" />
        <span>
          <strong>Role Enforcement Active:</strong> You are logged in as a <strong>RESIDENT</strong>. Access is restricted to your own complaints only. Admin management functions are protected.
        </span>
      </div>

      {/* Complaints List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white flex items-center space-x-2">
          <FileText className="w-5 h-5 text-indigo-400" />
          <span>Submitted Complaints ({complaints.length})</span>
        </h2>

        {loading ? (
          <div className="p-8 text-center text-slate-500 text-sm">Loading complaints...</div>
        ) : complaints.length === 0 ? (
          <div className="p-12 text-center bg-slate-900/40 rounded-2xl border border-slate-800 text-slate-400 space-y-3">
            <CheckCircle2 className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-base font-medium text-slate-300">No complaints raised yet</p>
            <p className="text-xs text-slate-500">Need maintenance help? Click &quot;Raise New Complaint&quot; above.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {complaints.map((c) => (
              <div key={c.id} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-semibold text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
                        {c.category}
                      </span>
                      <span className="text-xs text-slate-500">
                        Raised on {new Date(c.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-white mt-1">{c.title}</h3>
                  </div>

                  <span className={`text-xs px-3 py-1 rounded-full border font-bold uppercase tracking-wider self-start ${getStatusColor(c.status)}`}>
                    {c.status.replace("_", " ")}
                  </span>
                </div>

                <p className="text-sm text-slate-300 leading-relaxed">{c.description}</p>

                {c.photoUrl && (
                  <div className="flex items-center space-x-2 text-xs text-indigo-300 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                    <ImageIcon className="w-4 h-4 text-indigo-400" />
                    <span>Photo Attachment:</span>
                    <a href={c.photoUrl} target="_blank" rel="noreferrer" className="underline hover:text-indigo-200 truncate">
                      {c.photoUrl}
                    </a>
                  </div>
                )}

                {/* Status History Timeline */}
                {c.statusHistory && c.statusHistory.length > 0 && (
                  <div className="pt-2">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center space-x-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>Status Timeline History</span>
                    </h4>
                    <div className="space-y-2 border-l-2 border-slate-800 pl-4 ml-1">
                      {c.statusHistory.map((h) => (
                        <div key={h.id} className="relative text-xs space-y-0.5">
                          <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-indigo-500 border-2 border-slate-900" />
                          <div className="flex items-center space-x-2 text-slate-300 font-medium">
                            <span className="text-indigo-400 font-semibold">{h.newStatus.replace("_", " ")}</span>
                            {h.notes && <span className="text-slate-400">— {h.notes}</span>}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {new Date(h.createdAt).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Complaint Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">Raise Maintenance Complaint</h3>
              <button onClick={() => setShowNewModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Title / Subject
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Water leak in kitchen pipe"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                >
                  <option value="PLUMBING">Plumbing</option>
                  <option value="ELECTRICAL">Electrical</option>
                  <option value="ELEVATOR">Elevator</option>
                  <option value="SECURITY">Security</option>
                  <option value="CLEANLINESS">Cleanliness</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the problem details..."
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Photo URL (Optional)
                </label>
                <input
                  type="url"
                  value={formData.photoUrl}
                  onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-sm font-medium hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-500 shadow-md flex items-center space-x-1.5"
                >
                  <Send className="w-4 h-4" />
                  <span>{submitting ? "Submitting..." : "Submit Complaint"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
