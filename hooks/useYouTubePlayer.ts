import { useEffect, useRef, useState, useCallback } from "react";
import { Lecture } from "@/types";
import { useStudyStore } from "@/store/useStudyStore";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export function useYouTubePlayer(lecture: Lecture | null) {
  const updateLectureWatchedSec = useStudyStore((s) => s.updateLectureWatchedSec);
  const toggleLectureComplete = useStudyStore((s) => s.toggleLectureComplete);
  const settings = useStudyStore((s) => s.settings);

  const playerRef = useRef<any>(null);
  const containerIdRef = useRef<string>(`yt-player-${Math.random().toString(36).substring(2, 9)}`);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(lecture?.durationSec || 0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isReady, setIsReady] = useState(false);

  // Load YouTube Iframe API script if not already loaded
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }, []);

  // Initialize player when container and API are ready
  useEffect(() => {
    if (!lecture) return;

    let checkInterval: NodeJS.Timeout;

    const initPlayer = () => {
      if (typeof window === "undefined" || !window.YT || !window.YT.Player) {
        return false;
      }

      const element = document.getElementById(containerIdRef.current);
      if (!element) return false;

      // Clean up existing player if any
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {}
      }

      const startSeconds = lecture.watchedSec && lecture.watchedSec > 5 ? lecture.watchedSec : 0;

      playerRef.current = new window.YT.Player(containerIdRef.current, {
        videoId: lecture.videoId,
        playerVars: {
          autoplay: 1,
          start: startSeconds,
          modestbranding: 1,
          rel: 0,
        },
        events: {
          onReady: (event: any) => {
            setIsReady(true);
            const totalDuration = event.target.getDuration();
            if (totalDuration > 0) {
              setDuration(totalDuration);
            }
            if (startSeconds > 0) {
              event.target.seekTo(startSeconds, true);
            }
          },
          onStateChange: (event: any) => {
            // YT.PlayerState.PLAYING is 1
            if (event.data === 1) {
              setIsPlaying(true);
            } else {
              setIsPlaying(false);
            }

            // YT.PlayerState.ENDED is 0
            if (event.data === 0) {
              toggleLectureComplete(lecture.id, true);
            }
          },
        },
      });

      return true;
    };

    if (!initPlayer()) {
      checkInterval = setInterval(() => {
        if (initPlayer()) {
          clearInterval(checkInterval);
        }
      }, 300);
    }

    return () => {
      if (checkInterval) clearInterval(checkInterval);
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {}
        playerRef.current = null;
      }
      setIsReady(false);
      setIsPlaying(false);
    };
  }, [lecture?.id, lecture?.videoId]);

  // Periodic position sync every 10 seconds and local timer tick
  useEffect(() => {
    if (!lecture || !isReady) return;

    const timer = setInterval(() => {
      if (playerRef.current && typeof playerRef.current.getCurrentTime === "function") {
        try {
          const curr = Math.floor(playerRef.current.getCurrentTime());
          setCurrentTime(curr);
          const total = Math.floor(playerRef.current.getDuration());
          if (total > 0 && total !== duration) {
            setDuration(total);
          }
          // Save every 10 seconds or update local
          updateLectureWatchedSec(lecture.id, curr);
        } catch {}
      }
    }, 5000);

    return () => clearInterval(timer);
  }, [lecture?.id, isReady, duration, updateLectureWatchedSec]);

  const changeSpeed = useCallback((rate: number) => {
    if (playerRef.current && typeof playerRef.current.setPlaybackRate === "function") {
      playerRef.current.setPlaybackRate(rate);
      setPlaybackRate(rate);
    }
  }, []);

  const seekTo = useCallback((seconds: number) => {
    if (playerRef.current && typeof playerRef.current.seekTo === "function") {
      playerRef.current.seekTo(seconds, true);
      setCurrentTime(seconds);
    }
  }, []);

  return {
    containerId: containerIdRef.current,
    isPlaying,
    currentTime,
    duration: duration || lecture?.durationSec || 0,
    playbackRate,
    changeSpeed,
    seekTo,
    isReady,
  };
}
