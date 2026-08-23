"use client";

import { useState, useEffect } from "react";
import { Sliders, ShieldCheck, CheckCircle2, AlertCircle, Save, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function AdminSettingsPage() {
  const [overdueThresholdDays, setOverdueThresholdDays] = useState<number>(3);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          if (data.settings?.overdueThresholdDays) {
            setOverdueThresholdDays(data.settings.overdueThresholdDays);
          }
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overdueThresholdDays }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ text: "Overdue threshold successfully updated!", type: "success" });
      } else {
        setMessage({ text: data.error || "Failed to update settings", type: "error" });
      }
    } catch (err) {
      setMessage({ text: "Network error occurred while saving settings.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back button & Header */}
      <div className="flex items-center space-x-4">
        <Link
          href="/admin/dashboard"
          className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-xs uppercase font-bold tracking-wider text-emerald-400">Admin Control</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Society System Settings</h1>
        </div>
      </div>

      {/* Main Settings Card */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex items-center space-x-3 border-b border-slate-800 pb-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Overdue Complaint Threshold</h2>
            <p className="text-xs text-slate-400">
              Configure the time limit before open or in-progress complaints are dynamically flagged as overdue.
            </p>
          </div>
        </div>

        {message && (
          <div
            className={`p-4 rounded-xl border flex items-center space-x-3 text-sm font-medium ${
              message.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : "bg-rose-500/10 border-rose-500/30 text-rose-300"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {loading ? (
          <div className="p-8 text-center text-slate-500 text-sm">Loading current settings...</div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-3">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Threshold Days (1 to 30 days)
              </label>
              
              <div className="flex items-center space-x-3">
                <input
                  type="number"
                  min={1}
                  max={30}
                  required
                  value={overdueThresholdDays}
                  onChange={(e) => setOverdueThresholdDays(Number(e.target.value))}
                  className="w-28 px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-bold text-base focus:outline-none focus:border-indigo-500 text-center"
                />
                <span className="text-sm font-medium text-slate-300">Days</span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed pt-1">
                <strong>Dynamic Rule:</strong> Any complaint where <code>Status != RESOLVED</code> and <code>Age in Days &gt; {overdueThresholdDays}</code> will display an <strong>OVERDUE</strong> badge and automatically sort to the top of the Admin Dashboard.
              </p>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center space-x-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-indigo-600/25 transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? "Saving Changes..." : "Save Settings"}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
