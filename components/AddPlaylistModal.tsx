"use client";

import React, { useState } from "react";
import {
  X,
  Youtube,
  FolderPlus,
  Clock,
  Video,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useStudyStore } from "@/store/useStudyStore";
import { extractPlaylistId, formatDurationHuman } from "@/lib/utils";
import { ImportPreviewData } from "@/types";
import { toast } from "sonner";

const subjectColors = [
  "#00f0ff", // cyan
  "#a855f7", // purple
  "#39ff14", // green
  "#ff2e97", // pink
  "#ffb800", // amber
  "#3b82f6", // blue
  "#ec4899", // rose
];

const subjectIcons = ["BookOpen", "Code", "Cpu", "Atom", "Brain", "Calculator", "Layers"];

export function AddPlaylistModal() {
  const isAddPlaylistOpen = useStudyStore((s) => s.isAddPlaylistOpen);
  const setIsAddPlaylistOpen = useStudyStore((s) => s.setIsAddPlaylistOpen);
  const subjects = useStudyStore((s) => s.subjects);
  const playlists = useStudyStore((s) => s.playlists);
  const lectures = useStudyStore((s) => s.lectures);
  const settings = useStudyStore((s) => s.settings);

  const addSubject = useStudyStore((s) => s.addSubject);
  const addPlaylist = useStudyStore((s) => s.addPlaylist);
  const addLectures = useStudyStore((s) => s.addLectures);
  const updatePlaylist = useStudyStore((s) => s.updatePlaylist);

  const [urlInput, setUrlInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<ImportPreviewData | null>(null);
  const [duplicatePlaylist, setDuplicatePlaylist] = useState<any | null>(null);

  // Subject selection / creation state
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    subjects[0]?.id || "new"
  );
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectColor, setNewSubjectColor] = useState(subjectColors[0]);
  const [newSubjectIcon, setNewSubjectIcon] = useState(subjectIcons[0]);
  const [newSubjectExamDate, setNewSubjectExamDate] = useState("");

  if (!isAddPlaylistOpen) return null;

  const handleFetchPreview = async () => {
    setErrorMsg(null);
    setPreviewData(null);
    setDuplicatePlaylist(null);

    const playlistId = extractPlaylistId(urlInput);
    if (!playlistId) {
      setErrorMsg(
        "Invalid YouTube Playlist link. Example: https://www.youtube.com/playlist?list=PL..."
      );
      return;
    }

    // Check for existing playlist
    const existing = playlists.find((p) => p.youtubePlaylistId === playlistId);
    if (existing) {
      setDuplicatePlaylist(existing);
    }

    setLoading(true);
    try {
      const res = await fetch("/api/youtube", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-youtube-key": settings.youtubeKey,
        },
        body: JSON.stringify({
          action: "fetch_playlist",
          playlistId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch playlist");
      }

      setPreviewData(data);
      if (subjects.length > 0 && selectedSubjectId === "new") {
        setSelectedSubjectId(subjects[0].id);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmImport = (isResync = false) => {
    if (!previewData) return;

    let targetSubjectId = selectedSubjectId;

    if (selectedSubjectId === "new" || !targetSubjectId) {
      if (!newSubjectName.trim()) {
        toast.error("Please enter a subject name.");
        return;
      }
      const createdSubj = addSubject({
        name: newSubjectName.trim(),
        color: newSubjectColor,
        icon: newSubjectIcon,
        examDate: newSubjectExamDate || undefined,
      });
      targetSubjectId = createdSubj.id;
    }

    if (isResync && duplicatePlaylist) {
      // Re-sync: Add only new videos not already imported
      const existingVideoIds = new Set(
        lectures.filter((l) => l.playlistId === duplicatePlaylist.id).map((l) => l.videoId)
      );

      const newVideos = previewData.items.filter((item) => !existingVideoIds.has(item.videoId));

      if (newVideos.length === 0) {
        toast.info("Playlist is already up to date. No new videos found.");
        handleClose();
        return;
      }

      const startingOrder =
        lectures.filter((l) => l.playlistId === duplicatePlaylist.id).length + 1;

      addLectures(
        newVideos.map((v, idx) => ({
          playlistId: duplicatePlaylist.id,
          subjectId: duplicatePlaylist.subjectId,
          videoId: v.videoId,
          title: v.title,
          thumbnail: v.thumbnail,
          durationSec: v.durationSec,
          order: startingOrder + idx,
        }))
      );

      updatePlaylist(duplicatePlaylist.id, {
        totalDurationSec: (duplicatePlaylist.totalDurationSec || 0) +
          newVideos.reduce((a, b) => a + b.durationSec, 0),
      });

      toast.success(`Re-synced playlist! Added ${newVideos.length} new lecture(s).`);
      handleClose();
      return;
    }

    // Normal new import
    const newPlaylist = addPlaylist({
      subjectId: targetSubjectId,
      youtubePlaylistId: previewData.playlistId,
      title: previewData.title,
      channelName: previewData.channelTitle,
      thumbnail: previewData.thumbnail,
      totalDurationSec: previewData.totalDurationSec,
    });

    addLectures(
      previewData.items.map((item) => ({
        playlistId: newPlaylist.id,
        subjectId: targetSubjectId,
        videoId: item.videoId,
        title: item.title,
        thumbnail: item.thumbnail,
        durationSec: item.durationSec,
        order: item.order,
      }))
    );

    toast.success(
      `Imported "${previewData.title}" with ${previewData.items.length} lectures!`
    );
    handleClose();
  };

  const handleClose = () => {
    setIsAddPlaylistOpen(false);
    setUrlInput("");
    setPreviewData(null);
    setErrorMsg(null);
    setDuplicatePlaylist(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl glass-panel bg-[#0d0d16]/95 border border-white/10 shadow-2xl p-6 sm:p-8">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#00f0ff]/20 to-[#a855f7]/20 border border-[#00f0ff]/40 flex items-center justify-center text-[#00f0ff]">
            <Youtube className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white font-heading">
              Add YouTube Playlist
            </h2>
            <p className="text-xs text-gray-400">
              Paste any public or unlisted YouTube playlist link to structure it as a course
            </p>
          </div>
        </div>

        {/* Step 1: URL Input */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">
              YouTube Playlist Link
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="https://www.youtube.com/playlist?list=PL..."
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !loading) {
                    handleFetchPreview();
                  }
                }}
                className="flex-1 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#00f0ff] focus:ring-1 focus:ring-[#00f0ff] transition-all"
              />
              <button
                onClick={handleFetchPreview}
                disabled={loading || !urlInput.trim()}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#00f0ff] to-[#a855f7] text-black font-semibold text-sm hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(0,240,255,0.3)]"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                    <span>Fetching...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-black" />
                    <span>Inspect</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Duplicate Playlist Warning */}
          {duplicatePlaylist && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
              <div>
                <span className="font-semibold block">Playlist Already Imported</span>
                <span>
                  &ldquo;{duplicatePlaylist.title}&rdquo; is already in your tracker. You can
                  re-sync to fetch newly uploaded videos.
                </span>
              </div>
              <button
                onClick={() => handleConfirmImport(true)}
                className="ml-3 px-3 py-1.5 rounded-lg bg-amber-400 text-black font-semibold text-xs hover:bg-amber-300 flex items-center gap-1.5 shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Re-sync</span>
              </button>
            </div>
          )}

          {/* Step 2: Playlist Preview */}
          {previewData && (
            <div className="mt-6 space-y-6 pt-4 border-t border-white/10 animate-in fade-in duration-300">
              <div className="flex gap-4 items-start p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.08]">
                {previewData.thumbnail && (
                  <img
                    src={previewData.thumbnail}
                    alt={previewData.title}
                    className="w-28 h-18 object-cover rounded-lg border border-white/10 shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-white truncate">
                    {previewData.title}
                  </h4>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {previewData.channelTitle}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs font-mono text-gray-300">
                    <span className="flex items-center gap-1 text-[#00f0ff]">
                      <Video className="w-3.5 h-3.5" />
                      {previewData.itemCount} lectures
                    </span>
                    <span className="flex items-center gap-1 text-[#a855f7]">
                      <Clock className="w-3.5 h-3.5" />
                      {formatDurationHuman(previewData.totalDurationSec)}
                    </span>
                    {previewData.skippedCount > 0 && (
                      <span className="text-amber-400/90 text-[11px]">
                        ({previewData.skippedCount} private/deleted skipped)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Step 3: Select or Create Subject */}
              <div className="space-y-4">
                <label className="block text-xs font-medium text-gray-300">
                  Assign to Subject
                </label>

                {subjects.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {subjects.map((sub) => (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => setSelectedSubjectId(sub.id)}
                        className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                          selectedSubjectId === sub.id
                            ? "bg-white/[0.08] border-[#00f0ff] shadow-[0_0_15px_rgba(0,240,255,0.2)]"
                            : "bg-white/[0.02] border-white/10 hover:bg-white/[0.05]"
                        }`}
                      >
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: sub.color }}
                        />
                        <span className="text-xs font-medium text-white truncate">
                          {sub.name}
                        </span>
                      </button>
                    ))}

                    <button
                      type="button"
                      onClick={() => setSelectedSubjectId("new")}
                      className={`p-3 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                        selectedSubjectId === "new"
                          ? "bg-white/[0.08] border-[#a855f7] shadow-[0_0_15px_rgba(168,85,247,0.2)]"
                          : "bg-white/[0.02] border-dashed border-white/20 hover:bg-white/[0.05]"
                      }`}
                    >
                      <FolderPlus className="w-4 h-4 text-[#a855f7]" />
                      <span className="text-xs font-medium text-gray-300">
                        + New Subject
                      </span>
                    </button>
                  </div>
                )}

                {/* New Subject Form if selected */}
                {(selectedSubjectId === "new" || subjects.length === 0) && (
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-3 mt-3">
                    <span className="text-xs font-semibold text-gray-300 block">
                      Create New Subject
                    </span>
                    <div>
                      <input
                        type="text"
                        placeholder="Subject Name (e.g. Data Structures, Physics, Gate prep)"
                        value={newSubjectName}
                        onChange={(e) => setNewSubjectName(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-[#00f0ff]"
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <div>
                        <span className="text-[11px] text-gray-400 block mb-1.5">
                          Accent Color:
                        </span>
                        <div className="flex gap-2">
                          {subjectColors.map((col) => (
                            <button
                              key={col}
                              type="button"
                              onClick={() => setNewSubjectColor(col)}
                              className={`w-6 h-6 rounded-full transition-transform cursor-pointer ${
                                newSubjectColor === col
                                  ? "ring-2 ring-white scale-110"
                                  : "opacity-70 hover:opacity-100"
                              }`}
                              style={{ backgroundColor: col }}
                            />
                          ))}
                        </div>
                      </div>

                      <div>
                        <span className="text-[11px] text-gray-400 block mb-1.5">
                          Target Exam Date (Optional):
                        </span>
                        <input
                          type="date"
                          value={newSubjectExamDate}
                          onChange={(e) => setNewSubjectExamDate(e.target.value)}
                          className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-[#00f0ff]"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Import CTA */}
              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 rounded-xl text-xs text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmImport(false)}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#00f0ff] to-[#39ff14] text-black font-semibold text-xs hover:brightness-110 shadow-[0_0_20px_rgba(57,255,20,0.3)] transition-all flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-black" />
                  <span>Import {previewData.items.length} Lectures</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
