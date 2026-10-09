# STUDY TRACKER ⚡

> **Personal Study Command Center** — Turn YouTube playlists into structured courses, auto-plan schedules, track streaks, and master concepts with an AI Mentor grounded in your syllabus and progress.

---

## 🚀 Key Features

1. **YouTube Playlist Course Ingestion**
   - Direct support for `youtube.com/playlist?list=...`, `watch?v=..&list=..`, and short links.
   - Paginates and imports playlists of **500+ videos** via YouTube Data API v3 with ISO 8601 duration parsing.
   - Filters out deleted/private videos and reports skipped counts.
   - Prevents duplicate imports with a one-click **Re-sync** button to append newly uploaded lectures.

2. **Embedded YouTube Player Modal**
   - Built on the YouTube IFrame Player API.
   - Resumes playback from your exact `watchedSec`.
   - Periodic 10-second watched position auto-sync.
   - Auto marks lecture as complete when 90% watched (configurable toggle).
   - Playback speed control (0.75x, 1x, 1.25x, 1.5x, 2x).
   - Real-time lecture notes panel with autosave.
   - Instant *"Ask AI Mentor about this lecture"* button.

3. **Intelligent Calendar & Auto-Plan Engine**
   - Custom month and week views with neon glowing today indicator.
   - Drag-and-drop lecture scheduling.
   - **Auto-Plan Pacing Engine**:
     - *By rate*: Set $N$ lectures per day.
     - *By target date*: Pick a deadline and the engine balances your daily load.
     - Optional "Skip Sundays" or exclude mock test days.
     - Real-time preview before committing.
   - **Overdue Rescheduling**: 1-click batch rescheduling of past uncompleted lectures starting from today.
   - Custom calendar events (Exams, Quizzes, Revision) with milestone countdown badges.

4. **AI Mentor (Google Gemini)**
   - Streaming SSE chat via Google Gemini REST API (`gemini-3.8-flash` default or custom model).
   - Math equation rendering via KaTeX ($...$ and $$...$$) and GitHub Flavored Markdown with syntax-highlighted code.
   - **Context-Aware System Instructions**: Injects your active lecture title, saved notes, difficulty flags, overdue count, completion percentage, and streak into the system prompt.
   - Natural **Hinglish** (default) or **English** mentoring tone.
   - Quick action chips:
     - *Today's plan*
     - *Analyze my progress*
     - *Quiz me (Interactive 5 MCQs)*
     - *Summarize this topic*
     - *Make revision notes (Downloadable as Markdown)*
     - *Explain like I'm 12*

5. **Spaced Repetition & Velocity Analytics**
   - Automatically queues lectures flagged as **difficult** or completed **3, 7, 15 days ago** in "Revise Today".
   - Current streak and all-time longest streak tracking.
   - 6-Month GitHub-style activity intensity heatmap with daily tooltips.
   - Weekly bar chart, 30-day velocity trend line, and subject-wise completion donut (Recharts).
   - Estimated completion date per subject based on your last 14 days velocity.

6. **Deep Work Pomodoro Widget & Daily Reminders**
   - 25-minute focus sprints / 5-minute recovery intervals.
   - Auto-logs completed Pomodoro minutes directly to your study heatmap and analytics.
   - Scheduled daily browser notifications & evening streak-saver nudges.
   - Global keyboard shortcuts: `⌘K` / `Ctrl+K` for command palette, `N` for new playlist, `C` for calendar, `A` for AI mentor.
   - **Local-First Cloud Architecture**: App loads instantly from `localStorage` for offline support, while securely syncing your progress, notes, and settings across devices via MongoDB.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 14+ (App Router), TypeScript
- **Styling**: Tailwind CSS (Dark theme `#07070c`, Glassmorphism, Neon cyan/purple/pink accents)
- **State Management**: Zustand with `persist` middleware + MongoDB Cloud Sync
- **Visuals & Charts**: Recharts, Framer Motion, Lucide Icons
- **Markdown & Math**: `react-markdown`, `remark-gfm`, `remark-math`, `rehype-katex`, `katex`
- **Notifications**: Web Notifications API + Service Worker (`/sw.js`)
- **Toasts**: Sonner

---

## 🔑 How to Get Your Free API Keys

> **Note**: Both keys are optional to explore demo courses, but required for live YouTube imports and AI chat. Keys are saved to your local browser and automatically synced to your private MongoDB account for cross-device access. They are sent through standard request headers to Next.js API routes (`/api/gemini`, `/api/groq`, etc). They are **never hardcoded**.

### 1. Google Gemini API Key (Free)
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Sign in with your Google account.
3. Click **"Create API key"** and select or create a Google Cloud project.
4. Copy the API key (starts with `AIzaSy...`).
5. In Study Tracker, navigate to **Settings**, paste your key, and click **"Test Key"**.

### 2. YouTube Data API v3 Key (Free)
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (e.g., `Study-Tracker-Project`).
3. In the search bar at the top, search for **"YouTube Data API v3"** and click **Enable**.
4. Go to **APIs & Services > Credentials**.
5. Click **+ Create Credentials > API Key**.
6. (Recommended) Click **Edit API Key** and set **API Restrictions** to restrict the key exclusively to *YouTube Data API v3*.
7. In Study Tracker, navigate to **Settings**, paste the key, and click **"Test Key"**.

---

## 💻 Local Development Setup

### Prerequisites
- Node.js `18.18+` or `20+` or `22+`
- npm, pnpm, or yarn

### Steps
```bash
# 1. Install dependencies
npm install

# 2. Run the development server
npm run dev

# 3. Open http://localhost:3000 in your browser
```

---

## 🚢 Deploying on Vercel (Zero Configuration)

1. Push your repository to GitHub / GitLab / Bitbucket.
2. Go to [Vercel](https://vercel.com/) and click **"Add New Project"**.
3. Import your repository.
4. Framework Preset will automatically detect **Next.js**.
5. Click **Deploy**.
6. That's it! Users can enter their API keys directly in the web app UI on the **Settings** page.

---

## ⚠️ Known Limitations

1. **Browser Notification Limitations**:
   - Web Push and Notification APIs require the web browser or PWA window to be open or running in the background.
   - On iOS (Safari/WebKit), Web Push notifications are only supported if you add the app to your Home Screen as a PWA (iOS 16.4+).
2. **YouTube API Quotas**:
   - Google Cloud provides a default free quota of **10,000 units/day** for YouTube Data API v3.
   - Fetching playlist items costs ~1 unit per 50 videos; fetching video durations costs ~1 unit per 50 videos. A 500-video playlist costs roughly 20–25 units.
3. **Browser LocalStorage Quotas**:
   - Standard browser `localStorage` provides **5MB** of storage. Study Tracker monitors this in Settings and alerts you when 80% capacity is reached so you can export a backup JSON.
