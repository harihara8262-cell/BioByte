import React, { useState } from "react";
import { 
  Settings as SettingsIcon, 
  User, 
  Download, 
  Sparkles, 
  Moon, 
  Database,
  Check,
  ShieldAlert,
  Loader2
} from "lucide-react";
import { motion } from "framer-motion";

export default function Settings() {
  const [profile, setProfile] = useState({
    name: "Dr. Avery Vance",
    role: "Lead Greenkeeper",
    email: "avery.vance@biobyte.io"
  });

  const [editMode, setEditMode] = useState(false);
  const [glowEnabled, setGlowEnabled] = useState(true);
  const [exporting, setExporting] = useState(false);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setEditMode(false);
  };

  const handleExportData = async () => {
    setExporting(true);
    try {
      const res = await fetch("http://localhost:8000/api/my-plants");
      if (res.ok) {
        const data = await res.json();
        
        // Convert to string and download
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `biobyte_garden_export_${new Date().toISOString().split('T')[0]}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
      } else {
        alert("Failed to export data");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to export data");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex-1 min-h-screen overflow-y-auto px-8 py-10 relative">
      <div className="max-w-4xl mx-auto flex flex-col gap-8">
        
        {/* Title */}
        <div className="flex flex-col gap-1.5 border-b border-bio-card-border/20 pb-5">
          <h2 className="text-3xl font-extrabold tracking-tight text-white font-sans flex items-center gap-3">
            <SettingsIcon className="w-7 h-7 text-bio-emerald" />
            Nursery Settings
          </h2>
          <p className="text-sm text-slate-400 font-light">
            Manage your researcher profile, customize interface glows, and backup garden data.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Forms */}
          <div className="md:col-span-8 flex flex-col gap-6">
            
            {/* User Profile Card */}
            <div className="glass-panel p-6 rounded-3xl flex flex-col gap-5">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <User className="w-4 h-4 text-bio-emerald" />
                Botanist Profile
              </h3>

              {!editMode ? (
                <div className="flex justify-between items-center bg-bio-black/30 p-4 rounded-2xl border border-bio-card-border/10">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-bio-emerald to-bio-light-emerald flex items-center justify-center font-extrabold text-bio-black text-lg shadow-neon-emerald">
                      {profile.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{profile.name}</h4>
                      <p className="text-xs text-slate-400 font-light mt-0.5">{profile.role}</p>
                      <p className="text-[10px] text-slate-500 font-light">{profile.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setEditMode(true)}
                    className="px-4 py-2 border border-bio-card-border/30 hover:border-bio-emerald bg-bio-card-bg/20 text-xs font-semibold text-slate-300 hover:text-white rounded-xl transition-all"
                  >
                    Edit Profile
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Researcher Name</label>
                      <input 
                        type="text" 
                        required
                        className="glass-input px-4 py-2.5 rounded-xl text-xs"
                        value={profile.name}
                        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Role / Title</label>
                      <input 
                        type="text" 
                        required
                        className="glass-input px-4 py-2.5 rounded-xl text-xs"
                        value={profile.role}
                        onChange={(e) => setProfile({ ...profile, role: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Contact Email</label>
                    <input 
                      type="email" 
                      required
                      className="glass-input px-4 py-2.5 rounded-xl text-xs"
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    />
                  </div>

                  <div className="flex gap-2 justify-end mt-2">
                    <button
                      type="button"
                      onClick={() => setEditMode(false)}
                      className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-bio-emerald text-bio-black text-xs font-bold rounded-xl flex items-center gap-1.5 hover:scale-[1.01] transition-all"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Save Changes
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Interface Preferences */}
            <div className="glass-panel p-6 rounded-3xl flex flex-col gap-5">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-bio-emerald" />
                Interface Diagnostics
              </h3>

              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center border-b border-bio-card-border/10 pb-3">
                  <div>
                    <span className="text-xs font-bold text-slate-300">Glassmorphism Accent Glow</span>
                    <p className="text-[10px] text-slate-500 font-light mt-0.5">Toggle futuristic shadow-neon effects across card overlays</p>
                  </div>
                  <button
                    onClick={() => setGlowEnabled(!glowEnabled)}
                    className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 relative ${
                      glowEnabled ? "bg-bio-emerald" : "bg-slate-800"
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-bio-black transition-transform duration-300 ${
                      glowEnabled ? "translate-x-6" : "translate-x-0"
                    }`} />
                  </button>
                </div>

                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-xs font-bold text-slate-300">System Theme</span>
                    <p className="text-[10px] text-slate-500 font-light mt-0.5">BioByte uses a default cyber-green dark theme</p>
                  </div>
                  <div className="px-3.5 py-1.5 bg-bio-black/40 border border-bio-card-border/10 text-[10px] font-bold text-slate-300 uppercase tracking-widest rounded-xl flex items-center gap-1.5 select-none">
                    <Moon className="w-3.5 h-3.5 text-bio-emerald" />
                    Dark Green
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Database / Export Utilities */}
          <div className="md:col-span-4 flex flex-col gap-6">
            
            {/* Database & Data Backup */}
            <div className="glass-panel p-6 rounded-3xl flex flex-col gap-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-bio-emerald/5 rounded-full blur-2xl pointer-events-none" />
              
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Database className="w-4 h-4 text-bio-emerald" />
                Data Portability
              </h3>
              
              <p className="text-xs text-slate-400 font-light leading-relaxed">
                Download your complete plants database profile, care logs history, and notes as a backup JSON file.
              </p>

              <button
                onClick={handleExportData}
                disabled={exporting}
                className="w-full py-3 bg-bio-emerald/10 hover:bg-bio-emerald/20 border border-bio-emerald/30 text-bio-light-emerald font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all hover:scale-[1.01]"
              >
                {exporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>Export Gardens JSON</span>
              </button>
            </div>

            {/* Core engine telemetry status info */}
            <div className="glass-panel p-5 rounded-3xl flex flex-col gap-3 border-amber-500/10 bg-amber-950/5">
              <div className="flex gap-2.5 items-start">
                <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Database Stream</span>
                  <p className="text-[10px] text-slate-400 font-light leading-relaxed">
                    BioByte runs SQLite internally. Modifications sync directly to <code>plants.db</code>. Reset requires manual CLI operation.
                  </p>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
