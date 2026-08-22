"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { LogOut, ShieldCheck, UserCheck, Wrench } from "lucide-react";

export function Navbar() {
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 text-slate-100 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <Wrench className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-lg text-white tracking-tight">SocietyTracker</span>
            <span className="text-xs block text-slate-400 font-medium">Maintenance & Operations</span>
          </div>
        </Link>

        {session?.user && (
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3 bg-slate-800/80 px-3.5 py-1.5 rounded-full border border-slate-700/60">
              <div className="flex items-center space-x-2">
                {session.user.role === "ADMIN" ? (
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                ) : (
                  <UserCheck className="w-4 h-4 text-indigo-400" />
                )}
                <span className="text-sm font-semibold text-slate-200">{session.user.name}</span>
                {session.user.unitNumber && (
                  <span className="text-xs text-slate-400 bg-slate-700/60 px-2 py-0.5 rounded-full">
                    {session.user.unitNumber}
                  </span>
                )}
              </div>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                  session.user.role === "ADMIN"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                }`}
              >
                {session.user.role}
              </span>
            </div>

            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center space-x-1.5 text-xs font-medium text-slate-300 hover:text-rose-400 bg-slate-800 hover:bg-rose-500/10 px-3 py-2 rounded-lg border border-slate-700 hover:border-rose-500/30 transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
