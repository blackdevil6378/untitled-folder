import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  Subject,
  Playlist,
  Lecture,
  CalendarEvent,
  StudySession,
  ChatThread,
  Settings,
  ChatMessage,
  User,
} from "@/types";
import { generateId, toISODate } from "@/lib/utils";

interface StudyStoreState {
  subjects: Subject[];
  playlists: Playlist[];
  lectures: Lecture[];
  events: CalendarEvent[];
  sessions: StudySession[];
  threads: ChatThread[];
  settings: Settings;
  user: User | null;
  firebaseUid: string | null;
  
  // Auth Actions
  login: (userData: { name: string; email: string; avatar?: string }) => void;
  logout: () => void;
  setFirebaseUid: (uid: string | null) => void;
  
  // Ephemeral UI states
  activeVideoLecture: Lecture | null;
  isAddPlaylistOpen: boolean;
  isPomodoroOpen: boolean;
  commandPaletteOpen: boolean;

  // Actions
  setActiveVideoLecture: (lecture: Lecture | null) => void;
  setIsAddPlaylistOpen: (open: boolean) => void;
  setIsPomodoroOpen: (open: boolean) => void;
  setCommandPaletteOpen: (open: boolean) => void;

  // Subject Actions
  addSubject: (subject: Omit<Subject, "id" | "createdAt">) => Subject;
  updateSubject: (id: string, updates: Partial<Subject>) => void;
  deleteSubject: (id: string) => void;
  reorderSubjects: (reordered: Subject[]) => void;

  // Playlist Actions
  addPlaylist: (playlist: Omit<Playlist, "id" | "importedAt">) => Playlist;
  updatePlaylist: (id: string, updates: Partial<Playlist>) => void;
  deletePlaylist: (id: string) => void;

  addLectures: (
    lectures: Array<
      Pick<
        Lecture,
        "playlistId" | "subjectId" | "videoId" | "title" | "thumbnail" | "durationSec" | "order"
      > &
        Partial<Lecture>
    >
  ) => void;
  updateLecture: (id: string, updates: Partial<Lecture>) => void;
  toggleLectureComplete: (id: string, forceStatus?: boolean) => void;
  setLectureNotes: (id: string, notes: string) => void;
  toggleLectureDifficult: (id: string) => void;
  markRevised: (id: string) => void;
  scheduleLecture: (id: string, date?: string) => void;
  batchScheduleLectures: (assignments: { lectureId: string; date: string }[]) => void;
  batchToggleComplete: (lectureIds: string[], completed: boolean) => void;
  updateLectureWatchedSec: (id: string, watchedSec: number) => void;

  // Calendar Event Actions
  addEvent: (event: Omit<CalendarEvent, "id">) => CalendarEvent;
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => void;
  deleteEvent: (id: string) => void;

  // Study Session Actions
  logStudySession: (minutes: number, lectureId?: string, date?: string) => void;

  // Chat Actions
  getOrCreateThread: (key: string, title?: string) => ChatThread;
  addMessageToThread: (threadKey: string, message: Omit<ChatMessage, "ts">) => void;
  clearThread: (threadKey: string) => void;
  deleteThread: (threadId: string) => void;

  // Settings Actions
  updateSettings: (updates: Partial<Settings>) => void;

  // System Actions
  resetAllData: () => void;
  importAllData: (data: Partial<StudyStoreState>) => boolean;
  loadDemoData: () => void;
  
  // Sync Actions (for Firebase)
  getSyncableData: () => Record<string, any>;
  loadSyncedData: (data: Record<string, any>) => void;
}

const defaultSettings: Settings = {
  userName: "Aspirant",
  geminiKey: "",
  youtubeKey: "",
  groqKey: "",
  geminiModel: "gemini-3.8-flash",
  groqModel: "llama3-8b-8192",
  dailyGoalLectures: 3,
  language: "hinglish",
  reminderEnabled: false,
  reminderTime: "09:00",
  eveningReminderEnabled: false,
  eveningReminderTime: "20:00",
  autoMarkComplete: true,
  aiProvider: "auto",
  ollamaUrl: "http://127.0.0.1:11434",
  ollamaModel: "qwen3.5:2b",
};

export const useStudyStore = create<StudyStoreState>()(
  persist(
    (set, get) => ({
      subjects: [],
      playlists: [],
      lectures: [],
      events: [],
      sessions: [],
      threads: [],
      settings: defaultSettings,
      user: null,
      firebaseUid: null,

      login: (userData) =>
        set((state) => ({
          user: {
            id: state.firebaseUid || generateId("usr"),
            name: userData.name,
            email: userData.email,
            avatar: userData.avatar,
            role: "Student",
            createdAt: new Date().toISOString(),
          },
          settings: {
            ...state.settings,
            userName: userData.name || state.settings.userName,
          },
        })),
      logout: () => set({ user: null, firebaseUid: null }),
      setFirebaseUid: (uid) => set({ firebaseUid: uid }),

      activeVideoLecture: null,
      isAddPlaylistOpen: false,
      isPomodoroOpen: false,
      commandPaletteOpen: false,

      setActiveVideoLecture: (lecture) => set({ activeVideoLecture: lecture }),
      setIsAddPlaylistOpen: (open) => set({ isAddPlaylistOpen: open }),
      setIsPomodoroOpen: (open) => set({ isPomodoroOpen: open }),
      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

      // Subject Actions
      addSubject: (data) => {
        const newSubject: Subject = {
          ...data,
          id: generateId("subj"),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ subjects: [...state.subjects, newSubject] }));
        return newSubject;
      },

      updateSubject: (id, updates) => {
        set((state) => ({
          subjects: state.subjects.map((s) =>
            s.id === id ? { ...s, ...updates } : s
          ),
        }));
      },

      deleteSubject: (id) => {
        set((state) => ({
          subjects: state.subjects.filter((s) => s.id !== id),
          playlists: state.playlists.filter((p) => p.subjectId !== id),
          lectures: state.lectures.filter((l) => l.subjectId !== id),
          events: state.events.filter((e) => e.subjectId !== id),
        }));
      },

      reorderSubjects: (reordered) => set({ subjects: reordered }),

      // Playlist Actions
      addPlaylist: (data) => {
        const newPlaylist: Playlist = {
          ...data,
          id: generateId("pl"),
          importedAt: new Date().toISOString(),
        };
        set((state) => ({ playlists: [...state.playlists, newPlaylist] }));
        return newPlaylist;
      },

      updatePlaylist: (id, updates) => {
        set((state) => ({
          playlists: state.playlists.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        }));
      },

      deletePlaylist: (id) => {
        set((state) => ({
          playlists: state.playlists.filter((p) => p.id !== id),
          lectures: state.lectures.filter((l) => l.playlistId !== id),
        }));
      },

      // Lecture Actions
      addLectures: (rawLectures) => {
        const newLectures: Lecture[] = rawLectures.map((l) => ({
          completed: false,
          watchedSec: 0,
          notes: "",
          difficult: false,
          revisionCount: 0,
          ...l,
          id: generateId("lec"),
        }));
        set((state) => ({ lectures: [...state.lectures, ...newLectures] }));
      },

      updateLecture: (id, updates) => {
        set((state) => ({
          lectures: state.lectures.map((l) =>
            l.id === id ? { ...l, ...updates } : l
          ),
          activeVideoLecture:
            state.activeVideoLecture?.id === id
              ? { ...state.activeVideoLecture, ...updates }
              : state.activeVideoLecture,
        }));
      },

      toggleLectureComplete: (id, forceStatus) => {
        const now = new Date().toISOString();
        set((state) => {
          const updatedLectures = state.lectures.map((l) => {
            if (l.id !== id) return l;
            const newStatus = forceStatus !== undefined ? forceStatus : !l.completed;
            return {
              ...l,
              completed: newStatus,
              completedAt: newStatus ? now : undefined,
              watchedSec: newStatus ? l.durationSec : l.watchedSec,
            };
          });

          const currentActive = state.activeVideoLecture;
          const updatedActive =
            currentActive?.id === id
              ? {
                  ...currentActive,
                  completed: forceStatus !== undefined ? forceStatus : !currentActive.completed,
                  completedAt: !currentActive.completed ? now : undefined,
                }
              : currentActive;

          return {
            lectures: updatedLectures,
            activeVideoLecture: updatedActive,
          };
        });
      },

      setLectureNotes: (id, notes) => {
        set((state) => ({
          lectures: state.lectures.map((l) =>
            l.id === id ? { ...l, notes } : l
          ),
          activeVideoLecture:
            state.activeVideoLecture?.id === id
              ? { ...state.activeVideoLecture, notes }
              : state.activeVideoLecture,
        }));
      },

      toggleLectureDifficult: (id) => {
        set((state) => ({
          lectures: state.lectures.map((l) =>
            l.id === id ? { ...l, difficult: !l.difficult } : l
          ),
          activeVideoLecture:
            state.activeVideoLecture?.id === id
              ? { ...state.activeVideoLecture, difficult: !state.activeVideoLecture.difficult }
              : state.activeVideoLecture,
        }));
      },

      markRevised: (id) => {
        const now = new Date().toISOString();
        set((state) => ({
          lectures: state.lectures.map((l) =>
            l.id === id
              ? {
                  ...l,
                  revisionCount: (l.revisionCount || 0) + 1,
                  lastRevisedAt: now,
                }
              : l
          ),
        }));
      },

      scheduleLecture: (id, date) => {
        set((state) => ({
          lectures: state.lectures.map((l) =>
            l.id === id ? { ...l, scheduledDate: date } : l
          ),
        }));
      },

      batchScheduleLectures: (assignments) => {
        const map = new Map<string, string>();
        assignments.forEach((a) => map.set(a.lectureId, a.date));

        set((state) => ({
          lectures: state.lectures.map((l) =>
            map.has(l.id) ? { ...l, scheduledDate: map.get(l.id) } : l
          ),
        }));
      },

      batchToggleComplete: (lectureIds, completed) => {
        const idSet = new Set(lectureIds);
        const now = new Date().toISOString();
        set((state) => ({
          lectures: state.lectures.map((l) =>
            idSet.has(l.id)
              ? {
                  ...l,
                  completed,
                  completedAt: completed ? now : undefined,
                  watchedSec: completed ? l.durationSec : l.watchedSec,
                }
              : l
          ),
        }));
      },

      updateLectureWatchedSec: (id, watchedSec) => {
        const { settings } = get();
        set((state) => {
          const lec = state.lectures.find((l) => l.id === id);
          if (!lec) return state;

          const updatedWatchedSec = Math.max(lec.watchedSec || 0, Math.floor(watchedSec));
          let shouldComplete = lec.completed;
          let completedAt = lec.completedAt;

          // Auto mark complete when 90% watched
          if (
            settings.autoMarkComplete &&
            !lec.completed &&
            lec.durationSec > 0 &&
            updatedWatchedSec >= lec.durationSec * 0.9
          ) {
            shouldComplete = true;
            completedAt = new Date().toISOString();
          }

          const updatedLectures = state.lectures.map((l) =>
            l.id === id
              ? {
                  ...l,
                  watchedSec: updatedWatchedSec,
                  completed: shouldComplete,
                  completedAt,
                }
              : l
          );

          const updatedActive =
            state.activeVideoLecture?.id === id
              ? {
                  ...state.activeVideoLecture,
                  watchedSec: updatedWatchedSec,
                  completed: shouldComplete,
                  completedAt,
                }
              : state.activeVideoLecture;

          return {
            lectures: updatedLectures,
            activeVideoLecture: updatedActive,
          };
        });
      },

      // Calendar Events
      addEvent: (data) => {
        const newEvent: CalendarEvent = {
          ...data,
          id: generateId("evt"),
        };
        set((state) => ({ events: [...state.events, newEvent] }));
        return newEvent;
      },

      updateEvent: (id, updates) => {
        set((state) => ({
          events: state.events.map((e) =>
            e.id === id ? { ...e, ...updates } : e
          ),
        }));
      },

      deleteEvent: (id) => {
        set((state) => ({
          events: state.events.filter((e) => e.id !== id),
        }));
      },

      // Study Session Logging (Pomodoro / custom)
      logStudySession: (minutes, lectureId, date) => {
        const todayStr = date || toISODate();
        const newSession: StudySession = {
          id: generateId("sess"),
          date: todayStr,
          lectureId,
          minutes,
        };
        set((state) => ({
          sessions: [...state.sessions, newSession],
        }));
      },

      // Chat Actions
      getOrCreateThread: (key, title) => {
        const { threads } = get();
        const existing = threads.find((t) => t.key === key);
        if (existing) return existing;

        const newThread: ChatThread = {
          id: generateId("thread"),
          key,
          title: title || (key === "general" ? "General AI Mentor" : "Lecture Discussion"),
          messages: [],
          updatedAt: Date.now(),
        };
        set((state) => ({ threads: [newThread, ...state.threads] }));
        return newThread;
      },

      addMessageToThread: (threadKey, message) => {
        const fullMessage: ChatMessage = {
          ...message,
          id: generateId("msg"),
          ts: Date.now(),
        };

        set((state) => {
          const index = state.threads.findIndex((t) => t.key === threadKey);
          if (index === -1) {
            const newThread: ChatThread = {
              id: generateId("thread"),
              key: threadKey,
              messages: [fullMessage],
              updatedAt: Date.now(),
            };
            return { threads: [newThread, ...state.threads] };
          }

          const target = state.threads[index];
          const updatedThread: ChatThread = {
            ...target,
            messages: [...target.messages, fullMessage],
            updatedAt: Date.now(),
          };

          const newThreads = [...state.threads];
          newThreads.splice(index, 1);
          return { threads: [updatedThread, ...newThreads] };
        });
      },

      clearThread: (threadKey) => {
        set((state) => ({
          threads: state.threads.map((t) =>
            t.key === threadKey ? { ...t, messages: [], updatedAt: Date.now() } : t
          ),
        }));
      },

      deleteThread: (threadId) => {
        set((state) => ({
          threads: state.threads.filter((t) => t.id !== threadId),
        }));
      },

      // Settings
      updateSettings: (updates) => {
        set((state) => ({
          settings: { ...state.settings, ...updates },
        }));
      },

      // Sync Actions (for Firebase)
      getSyncableData: () => {
        const state = get();
        return {
          subjects: state.subjects,
          playlists: state.playlists,
          lectures: state.lectures,
          events: state.events,
          sessions: state.sessions,
          threads: state.threads,
          settings: state.settings,
        };
      },
      loadSyncedData: (data) => {
        set((state) => ({
          subjects: data.subjects || state.subjects,
          playlists: data.playlists || state.playlists,
          lectures: data.lectures || state.lectures,
          events: data.events || state.events,
          sessions: data.sessions || state.sessions,
          threads: data.threads || state.threads,
          settings: data.settings ? { ...state.settings, ...data.settings } : state.settings,
        }));
      },

      // Reset
      resetAllData: () => {
        set({
          subjects: [],
          playlists: [],
          lectures: [],
          events: [],
          sessions: [],
          threads: [],
          settings: defaultSettings,
          activeVideoLecture: null,
        });
      },

      // Import
      importAllData: (data) => {
        try {
          set((state) => ({
            subjects: data.subjects || state.subjects,
            playlists: data.playlists || state.playlists,
            lectures: data.lectures || state.lectures,
            events: data.events || state.events,
            sessions: data.sessions || state.sessions,
            threads: data.threads || state.threads,
            settings: { ...state.settings, ...(data.settings || {}) },
          }));
          return true;
        } catch {
          return false;
        }
      },

      // Demo Data
      loadDemoData: () => {
        const subj1Id = generateId("subj");
        const subj2Id = generateId("subj");
        const pl1Id = generateId("pl");
        const pl2Id = generateId("pl");

        const todayStr = toISODate();
        const tomorrowStr = toISODate(new Date(Date.now() + 86400000));
        const examDateStr = toISODate(new Date(Date.now() + 86400000 * 25));

        const demoSubjects: Subject[] = [
          {
            id: subj1Id,
            name: "Data Structures & Algorithms",
            color: "#00f0ff",
            icon: "Code",
            createdAt: new Date().toISOString(),
            examDate: examDateStr,
          },
          {
            id: subj2Id,
            name: "Computer Networks & OS",
            color: "#a855f7",
            icon: "Cpu",
            createdAt: new Date().toISOString(),
          },
        ];

        const demoPlaylists: Playlist[] = [
          {
            id: pl1Id,
            subjectId: subj1Id,
            youtubePlaylistId: "PL9gnSGHSqcnr_Um34Jx8_wfq446nU0VUw",
            title: "Complete DSA in Java & C++",
            channelName: "Kunal Kushwaha",
            thumbnail: "https://i.ytimg.com/vi/rZ41y93P2Qo/hqdefault.jpg",
            importedAt: new Date().toISOString(),
            totalDurationSec: 14400,
          },
          {
            id: pl2Id,
            subjectId: subj2Id,
            youtubePlaylistId: "PLBlnK6fEyqRgMCUAG0noG47eEvm10l0Lz",
            title: "Operating Systems Fundamentals",
            channelName: "Neso Academy",
            thumbnail: "https://i.ytimg.com/vi/26QPDBe-NB8/hqdefault.jpg",
            importedAt: new Date().toISOString(),
            totalDurationSec: 7200,
          },
        ];

        const demoLectures: Lecture[] = [
          {
            id: generateId("lec"),
            playlistId: pl1Id,
            subjectId: subj1Id,
            videoId: "rZ41y93P2Qo",
            title: "Introduction to Recursion - Basics & Memory Visualization",
            thumbnail: "https://i.ytimg.com/vi/rZ41y93P2Qo/hqdefault.jpg",
            durationSec: 3600,
            order: 1,
            completed: true,
            completedAt: new Date().toISOString(),
            watchedSec: 3600,
            notes: "Recursive tree structure, call stack memory, base condition importance.",
            difficult: false,
            revisionCount: 1,
            scheduledDate: todayStr,
            lastRevisedAt: new Date().toISOString(),
          },
          {
            id: generateId("lec"),
            playlistId: pl1Id,
            subjectId: subj1Id,
            videoId: "M2uO2nMT0Bk",
            title: "Backtracking Explained: N-Queens & Maze Problems",
            thumbnail: "https://i.ytimg.com/vi/M2uO2nMT0Bk/hqdefault.jpg",
            durationSec: 4200,
            order: 2,
            completed: false,
            watchedSec: 1200,
            notes: "Need to review state undo step during recursive backtracking.",
            difficult: true,
            revisionCount: 0,
            scheduledDate: todayStr,
          },
          {
            id: generateId("lec"),
            playlistId: pl1Id,
            subjectId: subj1Id,
            videoId: "W9AZ4Hftmsw",
            title: "Binary Trees & BST Implementation in depth",
            thumbnail: "https://i.ytimg.com/vi/W9AZ4Hftmsw/hqdefault.jpg",
            durationSec: 4800,
            order: 3,
            completed: false,
            watchedSec: 0,
            notes: "",
            difficult: false,
            revisionCount: 0,
            scheduledDate: tomorrowStr,
          },
          {
            id: generateId("lec"),
            playlistId: pl2Id,
            subjectId: subj2Id,
            videoId: "26QPDBe-NB8",
            title: "Introduction to Operating Systems & Kernel Architecture",
            thumbnail: "https://i.ytimg.com/vi/26QPDBe-NB8/hqdefault.jpg",
            durationSec: 2400,
            order: 1,
            completed: true,
            completedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
            watchedSec: 2400,
            notes: "Monolithic vs Microkernel differences.",
            difficult: false,
            revisionCount: 0,
          },
          {
            id: generateId("lec"),
            playlistId: pl2Id,
            subjectId: subj2Id,
            videoId: "OrM7nZcx5nA",
            title: "Process States and Process Control Block (PCB)",
            thumbnail: "https://i.ytimg.com/vi/OrM7nZcx5nA/hqdefault.jpg",
            durationSec: 2600,
            order: 2,
            completed: false,
            watchedSec: 600,
            notes: "New, Ready, Running, Waiting, Terminated states.",
            difficult: true,
            revisionCount: 0,
            scheduledDate: todayStr,
          },
        ];

        const demoEvents: CalendarEvent[] = [
          {
            id: generateId("evt"),
            title: "Semester DSA Practical Exam",
            type: "exam",
            date: examDateStr,
            time: "10:00",
            subjectId: subj1Id,
            color: "#00f0ff",
          },
          {
            id: generateId("evt"),
            title: "OS Unit Quiz",
            type: "test",
            date: toISODate(new Date(Date.now() + 86400000 * 5)),
            time: "14:00",
            subjectId: subj2Id,
            color: "#a855f7",
          },
        ];

        const demoSessions: StudySession[] = [
          {
            id: generateId("sess"),
            date: todayStr,
            minutes: 50,
          },
          {
            id: generateId("sess"),
            date: toISODate(new Date(Date.now() - 86400000)),
            minutes: 60,
          },
          {
            id: generateId("sess"),
            date: toISODate(new Date(Date.now() - 86400000 * 2)),
            minutes: 45,
          },
        ];

        set({
          subjects: demoSubjects,
          playlists: demoPlaylists,
          lectures: demoLectures,
          events: demoEvents,
          sessions: demoSessions,
        });
      },
    }),
    {
      name: "study-tracker-storage",
      version: 2,
      migrate: (persistedState: any, version: number) => {
        if (
          persistedState &&
          persistedState.settings &&
          (!persistedState.settings.geminiModel ||
            persistedState.settings.geminiModel === "gemini-2.0-flash")
        ) {
          persistedState.settings.geminiModel = "gemini-3.8-flash";
        }
        return persistedState;
      },
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        subjects: state.subjects,
        playlists: state.playlists,
        lectures: state.lectures,
        events: state.events,
        sessions: state.sessions,
        threads: state.threads,
        settings: state.settings,
        user: state.user,
        firebaseUid: state.firebaseUid,
      }),
    }
  )
);

if (typeof window !== "undefined") {
  let debounceTimer: ReturnType<typeof setTimeout>;
  useStudyStore.subscribe((state, prevState) => {
    if (!state.firebaseUid) return;

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const data = state.getSyncableData();
      fetch("/api/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-uid": state.firebaseUid!,
        },
        body: JSON.stringify({ state: data }),
      }).catch((err) => console.error("Failed to sync to MongoDB:", err));
    }, 5000);
  });
}
