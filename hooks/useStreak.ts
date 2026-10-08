import { useMemo } from "react";
import { useStudyStore } from "@/store/useStudyStore";
import { calculateStreaks } from "@/lib/streak";
import { format } from "date-fns";

export function useStreak() {
  const lectures = useStudyStore((s) => s.lectures);
  const sessions = useStudyStore((s) => s.sessions);

  return useMemo(() => {
    const { currentStreak, longestStreak, activeDatesSet } = calculateStreaks(
      lectures,
      sessions
    );

    const todayStr = format(new Date(), "yyyy-MM-dd");
    const studiedToday = activeDatesSet.has(todayStr);

    return {
      currentStreak,
      longestStreak,
      activeDatesSet,
      studiedToday,
    };
  }, [lectures, sessions]);
}
