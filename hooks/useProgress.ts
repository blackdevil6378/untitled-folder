import { useMemo } from "react";
import { useStudyStore } from "@/store/useStudyStore";
import { getStudyStats, estimateFinishDate } from "@/lib/streak";

export function useProgress(subjectId?: string) {
  const lectures = useStudyStore((s) => s.lectures);
  const subjects = useStudyStore((s) => s.subjects);
  const sessions = useStudyStore((s) => s.sessions);
  const settings = useStudyStore((s) => s.settings);

  return useMemo(() => {
    const targetLectures = subjectId
      ? lectures.filter((l) => l.subjectId === subjectId)
      : lectures;

    const totalLectures = targetLectures.length;
    const completedLectures = targetLectures.filter((l) => l.completed).length;
    const pendingLectures = totalLectures - completedLectures;
    const completionPercentage = totalLectures > 0
      ? Math.round((completedLectures / totalLectures) * 100)
      : 0;

    const totalDurationSec = targetLectures.reduce((acc, l) => acc + (l.durationSec || 0), 0);
    const watchedDurationSec = targetLectures.reduce((acc, l) => {
      if (l.completed) return acc + (l.durationSec || 0);
      return acc + (l.watchedSec || 0);
    }, 0);
    const remainingDurationSec = Math.max(0, totalDurationSec - watchedDurationSec);

    const stats = getStudyStats(lectures, sessions);

    // Subject breakdown
    const subjectProgressList = subjects.map((subj) => {
      const subjLectures = lectures.filter((l) => l.subjectId === subj.id);
      const total = subjLectures.length;
      const completed = subjLectures.filter((l) => l.completed).length;
      const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
      const totalSec = subjLectures.reduce((acc, l) => acc + (l.durationSec || 0), 0);
      const remainingSec = subjLectures.reduce((acc, l) => {
        if (l.completed) return acc;
        return acc + Math.max(0, (l.durationSec || 0) - (l.watchedSec || 0));
      }, 0);
      const estimation = estimateFinishDate(subj.id, lectures);

      return {
        subject: subj,
        total,
        completed,
        pending: total - completed,
        percentage: pct,
        totalDurationSec: totalSec,
        remainingDurationSec: remainingSec,
        estimation,
      };
    });

    const dailyGoal = settings.dailyGoalLectures || 3;
    const dailyGoalPercentage = Math.min(100, Math.round((stats.completedToday / dailyGoal) * 100));

    return {
      totalLectures,
      completedLectures,
      pendingLectures,
      completionPercentage,
      totalDurationSec,
      watchedDurationSec,
      remainingDurationSec,
      stats,
      subjectProgressList,
      dailyGoal,
      dailyGoalPercentage,
    };
  }, [lectures, subjects, sessions, settings, subjectId]);
}
