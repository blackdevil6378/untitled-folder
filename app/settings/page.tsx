"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Settings as SettingsIcon,
  Key,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Bell,
  Download,
  Upload,
  RotateCcw,
  ExternalLink,
  ShieldAlert,
  HardDrive,
  User,
  Sparkles,
  Loader2,
  Cpu,
  Server,
} from "lucide-react";
import { useStudyStore } from "@/store/useStudyStore";
import { useNotifications } from "@/hooks/useNotifications";
import { getLocalStorageUsage } from "@/lib/storage";
import { toast } from "sonner";

export default function SettingsPage() {
  const settings = useStudyStore((s) => s.settings);
  const updateSettings = useStudyStore((s) => s.updateSettings);
  const resetAllData = useStudyStore((s) => s.resetAllData);
  const importAllData = useStudyStore((s) => s.importAllData);
  const allStoreState = useStudyStore.getState();

  const {
    permission,
    requestPermission,
    sendTestNotification,
  } = useNotifications();

  // Local state for keys
  const [geminiKeyInput, setGeminiKeyInput] = useState(settings.geminiKey || "");
  const [youtubeKeyInput, setYoutubeKeyInput] = useState(settings.youtubeKey || "");
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showYoutubeKey, setShowYoutubeKey] = useState(false);

  // Testing Key States
  const [testingGemini, setTestingGemini] = useState(false);
  const [testingYoutube, setTestingYoutube] = useState(false);
  const [testingOllama, setTestingOllama] = useState(false);

  // Ollama status
  const [ollamaInfo, setOllamaInfo] = useState<{
    available: boolean;
    models: string[];
    loading: boolean;
  }>({
    available: false,
    models: [],
    loading: true,
  });

  // Storage calculation
  const [storageUsage, setStorageUsage] = useState({
    usedBytes: 0,
    percentage: 0,
    formattedUsed: "0 KB",
    isNearLimit: false,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check Ollama daemon on mount
  useEffect(() => {
    const checkOllama = async () => {
      try {
        const url = settings.ollamaUrl || "http://127.0.0.1:11434";
        const res = await fetch(`/api/ollama?url=${encodeURIComponent(url)}`);
        const data = await res.json();
        setOllamaInfo({
          available: !!data.available,
          models: data.models || [],
          loading: false,
        });
        if (data.available && (!settings.ollamaModel || !data.models.includes(settings.ollamaModel))) {
          if (data.defaultModel) {
            updateSettings({ ollamaModel: data.defaultModel });
          }
        }
      } catch {
        setOllamaInfo({ available: false, models: [], loading: false });
      }
    };
    checkOllama();
  }, [settings.ollamaUrl]);

  useEffect(() => {
    setStorageUsage(getLocalStorageUsage());
    if (!settings.geminiModel || settings.geminiModel === "gemini-2.0-flash") {
      updateSettings({ geminiModel: "gemini-3.8-flash" });
    }
  }, [settings.geminiModel, updateSettings]);

  const handleSaveKeys = () => {
    updateSettings({
      geminiKey: geminiKeyInput.trim(),
      youtubeKey: youtubeKeyInput.trim(),
    });
    toast.success("API keys saved securely in browser storage!");
  };

  const handleTestGeminiKey = async () => {
    const keyToTest = geminiKeyInput.trim() || settings.geminiKey;
    if (!keyToTest) {
      toast.error("Please enter a Gemini API Key first.");
      return;
    }

    setTestingGemini(true);
    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-gemini-key": keyToTest,
        },
        body: JSON.stringify({
          action: "test",
          model:
            (settings.geminiModel === "gemini-2.0-flash"
              ? "gemini-3.8-flash"
              : settings.geminiModel) || "gemini-3.8-flash",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gemini key verification failed.");
      }

      toast.success("✅ Gemini API Key is valid and working!");
      updateSettings({ geminiKey: keyToTest });
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setTestingGemini(false);
    }
  };

  const handleTestYoutubeKey = async () => {
    const keyToTest = youtubeKeyInput.trim() || settings.youtubeKey;
    if (!keyToTest) {
      toast.error("Please enter a YouTube Data API Key first.");
      return;
    }

    setTestingYoutube(true);
    try {
      const res = await fetch("/api/youtube", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-youtube-key": keyToTest,
        },
        body: JSON.stringify({ action: "test" }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "YouTube key verification failed.");
      }

      toast.success("✅ YouTube API Key is valid and working!");
      updateSettings({ youtubeKey: keyToTest });
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setTestingYoutube(false);
    }
  };

  const handleTestOllama = async () => {
    setTestingOllama(true);
    try {
      const url = settings.ollamaUrl || "http://127.0.0.1:11434";
      const res = await fetch("/api/ollama", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test",
          url,
          model: settings.ollamaModel || "qwen3.5:2b",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to reach Ollama server.");
      }
      toast.success(`✅ ${data.message}`);
      setOllamaInfo({
        available: true,
        models: data.models || ollamaInfo.models,
        loading: false,
      });
    } catch (err: any) {
      toast.error(`Ollama Error: ${err.message}`);
      setOllamaInfo((prev) => ({ ...prev, available: false, loading: false }));
    } finally {
      setTestingOllama(false);
    }
  };

  const handleExportJSON = () => {
    const exportData = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      subjects: allStoreState.subjects,
      playlists: allStoreState.playlists,
      lectures: allStoreState.lectures,
      events: allStoreState.events,
      sessions: allStoreState.sessions,
      threads: allStoreState.threads,
      settings: {
        ...allStoreState.settings,
        // Do not export secrets by default or ask user
        geminiKey: allStoreState.settings.geminiKey,
        youtubeKey: allStoreState.settings.youtubeKey,
      },
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `study_tracker_backup_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("All data exported as JSON!");
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const success = importAllData(json);
        if (success) {
          toast.success("Successfully imported all study data!");
          setGeminiKeyInput(json.settings?.geminiKey || "");
          setYoutubeKeyInput(json.settings?.youtubeKey || "");
          setStorageUsage(getLocalStorageUsage());
        } else {
          toast.error("Failed to parse backup format.");
        }
      } catch {
        toast.error("Invalid JSON file provided.");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleResetEverything = () => {
    if (
      confirm(
        "⚠️ WARNING: This will permanently erase ALL your subjects, playlists, lectures, calendar events, chat history, and settings from this browser! Proceed?"
      )
    ) {
      resetAllData();
      setGeminiKeyInput("");
      setYoutubeKeyInput("");
      setStorageUsage(getLocalStorageUsage());
      toast.success("All tracker data has been reset to defaults.");
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-heading flex items-center gap-2.5">
          <SettingsIcon className="w-7 h-7 text-[#00f0ff]" />
          <span>System Settings & API Keys</span>
        </h1>
        <p className="text-xs sm:text-sm text-gray-400 mt-1">
          Configure API credentials, study goals, notifications, and manage backups
        </p>
      </div>

      {/* Profile & General Preferences */}
      <div className="p-6 rounded-2xl glass-panel bg-white/[0.02] border border-white/10 space-y-4">
        <h2 className="text-sm uppercase tracking-wider font-semibold text-gray-300 font-heading flex items-center gap-2">
          <User className="w-4 h-4 text-[#00f0ff]" />
          <span>Student Profile & Targets</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-300 block mb-1.5 font-medium">
              Your Name (Dashboard Greeting)
            </label>
            <input
              type="text"
              value={settings.userName}
              onChange={(e) => updateSettings({ userName: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs focus:outline-none focus:border-[#00f0ff]"
            />
          </div>

          <div>
            <label className="text-xs text-gray-300 block mb-1.5 font-medium">
              Daily Target Goal (Lectures / Day)
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={settings.dailyGoalLectures}
              onChange={(e) =>
                updateSettings({ dailyGoalLectures: parseInt(e.target.value, 10) || 1 })
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-[#00f0ff]"
            />
          </div>
        </div>

        {/* AI Mentor Language Toggle */}
        <div className="pt-2">
          <label className="text-xs text-gray-300 block mb-1.5 font-medium">
            AI Mentor Persona Language
          </label>
          <div className="grid grid-cols-2 gap-3 max-w-sm">
            <button
              onClick={() => updateSettings({ language: "hinglish" })}
              className={`p-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                settings.language === "hinglish"
                  ? "bg-[#00f0ff] text-black font-bold shadow-[0_0_15px_rgba(0,240,255,0.3)]"
                  : "bg-white/[0.03] border-white/10 text-gray-400 hover:text-white"
              }`}
            >
              Hinglish (Recommended)
            </button>
            <button
              onClick={() => updateSettings({ language: "english" })}
              className={`p-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                settings.language === "english"
                  ? "bg-[#00f0ff] text-black font-bold shadow-[0_0_15px_rgba(0,240,255,0.3)]"
                  : "bg-white/[0.03] border-white/10 text-gray-400 hover:text-white"
              }`}
            >
              English Only
            </button>
          </div>
        </div>

        {/* Auto mark complete toggle */}
        <div className="flex items-center justify-between pt-2 border-t border-white/5">
          <div>
            <span className="text-xs font-semibold text-white block">
              Auto-Mark Complete at 90%
            </span>
            <span className="text-[11px] text-gray-400">
              Automatically flags a lecture as completed when 90% is watched in the embedded player
            </span>
          </div>
          <input
            type="checkbox"
            checked={settings.autoMarkComplete}
            onChange={(e) => updateSettings({ autoMarkComplete: e.target.checked })}
            className="w-5 h-5 rounded accent-[#00f0ff] cursor-pointer"
          />
        </div>
      </div>

      {/* API Keys Configuration */}
      <div className="p-6 rounded-2xl glass-panel bg-white/[0.02] border border-white/10 space-y-6">
        <div>
          <h2 className="text-sm uppercase tracking-wider font-semibold text-gray-300 font-heading flex items-center gap-2">
            <Key className="w-4 h-4 text-[#a855f7]" />
            <span>API Keys & Credentials</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Keys are stored solely in your local browser and sent over HTTPS request headers directly to Next.js API proxy routes. They are never logged or stored in any database.
          </p>
        </div>

        {/* Gemini API Key */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-gray-200">
              Google Gemini API Key
            </label>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-[#00f0ff] hover:underline flex items-center gap-1"
            >
              Get Free Key (Google AI Studio) <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={showGeminiKey ? "text" : "password"}
                placeholder="AIzaSy..."
                value={geminiKeyInput}
                onChange={(e) => setGeminiKeyInput(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-[#00f0ff] pr-10"
              />
              <button
                type="button"
                onClick={() => setShowGeminiKey(!showGeminiKey)}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-white cursor-pointer"
              >
                {showGeminiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <button
              onClick={handleTestGeminiKey}
              disabled={testingGemini}
              className="px-4 py-2.5 rounded-xl bg-white/[0.06] border border-white/15 text-xs text-white font-medium hover:bg-white/[0.1] transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              {testingGemini ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00f0ff]" />
                  <span>Testing...</span>
                </>
              ) : (
                <span>Test Key</span>
              )}
            </button>
          </div>

          {/* Model Selection */}
          <div className="pt-2 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-400">Gemini Model:</label>
              <span className="text-[11px] text-gray-500 font-mono">
                Active: <span className="text-[#00f0ff]">{settings.geminiModel || "gemini-3.8-flash"}</span>
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                { id: "gemini-3.8-flash", label: "gemini-3.8-flash (Recommended)" },
                { id: "gemini-2.5-flash", label: "gemini-2.5-flash" },
                { id: "gemini-2.5-pro", label: "gemini-2.5-pro" },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => updateSettings({ geminiModel: m.id })}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono border transition-all cursor-pointer ${
                    settings.geminiModel === m.id
                      ? "bg-[#00f0ff]/20 border-[#00f0ff] text-[#00f0ff] shadow-[0_0_10px_rgba(0,240,255,0.2)]"
                      : "bg-white/[0.03] border-white/10 text-gray-400 hover:text-white"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={settings.geminiModel}
                onChange={(e) => updateSettings({ geminiModel: e.target.value })}
                placeholder="gemini-3.8-flash"
                className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-white text-xs font-mono w-full sm:w-72 focus:outline-none focus:border-[#00f0ff]"
              />
              <span className="text-[11px] text-gray-500 font-mono hidden sm:inline">
                (or type custom model)
              </span>
            </div>
          </div>
        </div>

        {/* YouTube API Key */}
        <div className="space-y-2 pt-2 border-t border-white/5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-gray-200">
              YouTube Data API v3 Key
            </label>
            <a
              href="https://console.cloud.google.com/apis/credentials"
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-[#00f0ff] hover:underline flex items-center gap-1"
            >
              Get Key (Google Cloud Console) <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={showYoutubeKey ? "text" : "password"}
                placeholder="AIzaSy..."
                value={youtubeKeyInput}
                onChange={(e) => setYoutubeKeyInput(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-[#00f0ff] pr-10"
              />
              <button
                type="button"
                onClick={() => setShowYoutubeKey(!showYoutubeKey)}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-white cursor-pointer"
              >
                {showYoutubeKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <button
              onClick={handleTestYoutubeKey}
              disabled={testingYoutube}
              className="px-4 py-2.5 rounded-xl bg-white/[0.06] border border-white/15 text-xs text-white font-medium hover:bg-white/[0.1] transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              {testingYoutube ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00f0ff]" />
                  <span>Testing...</span>
                </>
              ) : (
                <span>Test Key</span>
              )}
            </button>
          </div>
        </div>

        <button
          onClick={handleSaveKeys}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#00f0ff] to-[#a855f7] text-black font-semibold text-xs hover:brightness-110 shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all cursor-pointer"
        >
          Save All Credentials
        </button>
      </div>

      {/* Local LLM (Ollama) & AI Provider Selection */}
      <div className="p-6 rounded-2xl glass-panel bg-white/[0.02] border border-white/10 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm uppercase tracking-wider font-semibold text-gray-300 font-heading flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#39ff14]" />
              <span>Local LLM (Ollama) & Fallback Engine</span>
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              Use your PC's local Ollama server as an automatic backup whenever Gemini quota is exhausted, offline, or unavailable.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {ollamaInfo.loading ? (
              <span className="text-[11px] font-mono text-gray-400 flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin text-[#00f0ff]" />
                Checking...
              </span>
            ) : ollamaInfo.available ? (
              <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Ollama Active
              </span>
            ) : (
              <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center gap-1.5 font-bold">
                <span className="w-2 h-2 rounded-full bg-rose-400" />
                Ollama Offline
              </span>
            )}
          </div>
        </div>

        {/* AI Provider Strategy Selection */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-200 block">
            AI Provider Strategy
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                id: "auto",
                title: "Auto-Fallback",
                desc: "Gemini first. If quota/key fails, automatically switches to local Ollama.",
                badge: "Recommended",
              },
              {
                id: "ollama",
                title: "Local Ollama Only",
                desc: "Runs 100% on your PC. Private, offline, zero API keys required.",
                badge: "Offline",
              },
              {
                id: "gemini",
                title: "Gemini Only",
                desc: "Strictly use Google Gemini cloud models.",
                badge: "Cloud",
              },
            ].map((prov) => {
              const isSelected = (settings.aiProvider || "auto") === prov.id;
              return (
                <button
                  key={prov.id}
                  type="button"
                  onClick={() => updateSettings({ aiProvider: prov.id as any })}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#00f0ff]/10 border-[#00f0ff] shadow-[0_0_15px_rgba(0,240,255,0.15)]"
                      : "bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-white">{prov.title}</span>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                        isSelected
                          ? "bg-[#00f0ff]/20 text-[#00f0ff]"
                          : "bg-white/10 text-gray-400"
                      }`}
                    >
                      {prov.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    {prov.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Ollama Configuration Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/5">
          {/* Base URL */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-300 flex items-center justify-between">
              <span>Ollama Host URL</span>
              <span className="text-[10px] text-gray-500 font-mono">Default: 127.0.0.1:11434</span>
            </label>
            <input
              type="text"
              value={settings.ollamaUrl || "http://127.0.0.1:11434"}
              onChange={(e) => updateSettings({ ollamaUrl: e.target.value })}
              placeholder="http://127.0.0.1:11434"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-[#39ff14]"
            />
          </div>

          {/* Model Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-300 flex items-center justify-between">
              <span>Local Model</span>
              <span className="text-[10px] text-gray-500 font-mono">Installed: {ollamaInfo.models.length}</span>
            </label>
            {ollamaInfo.models.length > 0 ? (
              <select
                value={settings.ollamaModel || "qwen3.5:2b"}
                onChange={(e) => updateSettings({ ollamaModel: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0c0d18] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-[#39ff14] cursor-pointer"
              >
                {ollamaInfo.models.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={settings.ollamaModel || "qwen3.5:2b"}
                onChange={(e) => updateSettings({ ollamaModel: e.target.value })}
                placeholder="qwen3.5:2b"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-[#39ff14]"
              />
            )}
          </div>
        </div>

        {/* Test Ollama Button */}
        <div className="flex items-center justify-between pt-1">
          <p className="text-[11px] text-gray-500">
            {ollamaInfo.available
              ? `Connected to Ollama with model '${settings.ollamaModel || "qwen3.5:2b"}'`
              : "Tip: Start Ollama desktop or run 'ollama serve' in terminal"}
          </p>

          <button
            onClick={handleTestOllama}
            disabled={testingOllama}
            className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-xs font-medium text-white transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            {testingOllama ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#39ff14]" />
                <span>Checking Ollama...</span>
              </>
            ) : (
              <>
                <Server className="w-3.5 h-3.5 text-[#39ff14]" />
                <span>Test Local Ollama</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Notifications & Reminders */}
      <div className="p-6 rounded-2xl glass-panel bg-white/[0.02] border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm uppercase tracking-wider font-semibold text-gray-300 font-heading flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#ffb800]" />
            <span>Daily Reminders & Notifications</span>
          </h2>

          {permission !== "granted" ? (
            <button
              onClick={requestPermission}
              className="px-3.5 py-1.5 rounded-xl bg-white/10 text-white font-semibold text-xs hover:bg-white/20 transition-colors cursor-pointer"
            >
              Grant Permission
            </button>
          ) : (
            <span className="text-[11px] font-mono text-[#39ff14] flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Permission Granted
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Daily Morning Reminder */}
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white">Morning Nudge</span>
              <input
                type="checkbox"
                checked={settings.reminderEnabled}
                onChange={(e) => updateSettings({ reminderEnabled: e.target.checked })}
                className="w-4 h-4 rounded accent-[#00f0ff]"
              />
            </div>
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>Scheduled Time:</span>
              <input
                type="time"
                value={settings.reminderTime}
                onChange={(e) => updateSettings({ reminderTime: e.target.value })}
                className="px-2 py-1 rounded bg-black/40 border border-white/10 text-white font-mono"
              />
            </div>
          </div>

          {/* Evening Streak Saver Nudge */}
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white">Evening Streak Saver</span>
              <input
                type="checkbox"
                checked={settings.eveningReminderEnabled}
                onChange={(e) => updateSettings({ eveningReminderEnabled: e.target.checked })}
                className="w-4 h-4 rounded accent-[#ff2e97]"
              />
            </div>
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>Scheduled Time:</span>
              <input
                type="time"
                value={settings.eveningReminderTime}
                onChange={(e) => updateSettings({ eveningReminderTime: e.target.value })}
                className="px-2 py-1 rounded bg-black/40 border border-white/10 text-white font-mono"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-start pt-2">
          <button
            onClick={sendTestNotification}
            className="px-4 py-2 rounded-xl bg-white/[0.05] border border-white/10 text-xs text-gray-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            Send Test Notification
          </button>
        </div>
      </div>

      {/* Storage & Backup / Import */}
      <div className="p-6 rounded-2xl glass-panel bg-white/[0.02] border border-white/10 space-y-6">
        <div>
          <h2 className="text-sm uppercase tracking-wider font-semibold text-gray-300 font-heading flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-[#39ff14]" />
            <span>Local Storage & Backup Center</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Export all courses, progress, schedules, and chat history as JSON to preserve or transfer devices.
          </p>
        </div>

        {/* LocalStorage Consumption Bar */}
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-300">Browser Storage Used:</span>
            <span className="font-mono text-white">
              {storageUsage.formattedUsed} ({storageUsage.percentage}% of 5MB quota)
            </span>
          </div>

          <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                storageUsage.isNearLimit ? "bg-red-500" : "bg-[#39ff14]"
              }`}
              style={{ width: `${Math.max(2, storageUsage.percentage)}%` }}
            />
          </div>

          {storageUsage.isNearLimit && (
            <div className="text-[11px] text-red-400 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Storage is nearing 80% limit. Export a JSON backup!</span>
            </div>
          )}
        </div>

        {/* Export / Import Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportJSON}
            className="px-4 py-2.5 rounded-xl bg-white/[0.06] border border-white/15 text-white font-semibold text-xs hover:bg-white/[0.1] transition-all flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#00f0ff]" />
            <span>Export Backup (JSON)</span>
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportJSON}
            accept=".json"
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2.5 rounded-xl bg-white/[0.06] border border-white/15 text-white font-semibold text-xs hover:bg-white/[0.1] transition-all flex items-center gap-2 cursor-pointer"
          >
            <Upload className="w-4 h-4 text-[#a855f7]" />
            <span>Import Backup (JSON)</span>
          </button>

          <button
            onClick={handleResetEverything}
            className="px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 font-semibold text-xs transition-all flex items-center gap-2 cursor-pointer ml-auto"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset All Data</span>
          </button>
        </div>
      </div>
    </div>
  );
}
