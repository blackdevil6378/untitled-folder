/**
 * Utility to calculate and monitor localStorage memory consumption.
 * Most browsers give 5MB (~5,242,880 bytes).
 */
export function getLocalStorageUsage(): {
  usedBytes: number;
  totalBytes: number;
  percentage: number;
  formattedUsed: string;
  isNearLimit: boolean;
} {
  if (typeof window === "undefined" || !window.localStorage) {
    return {
      usedBytes: 0,
      totalBytes: 5242880,
      percentage: 0,
      formattedUsed: "0 KB",
      isNearLimit: false,
    };
  }

  let totalLength = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      const val = localStorage.getItem(key) || "";
      totalLength += key.length + val.length;
    }
  }

  // Multiply by 2 because JS strings are UTF-16 (2 bytes per character)
  const usedBytes = totalLength * 2;
  const totalBytes = 5 * 1024 * 1024; // 5 MB standard quota
  const percentage = Math.min(100, Math.round((usedBytes / totalBytes) * 100));
  const formattedUsed =
    usedBytes < 1024 * 1024
      ? `${Math.round(usedBytes / 1024)} KB`
      : `${(usedBytes / (1024 * 1024)).toFixed(2)} MB`;

  return {
    usedBytes,
    totalBytes,
    percentage,
    formattedUsed,
    isNearLimit: percentage >= 80,
  };
}
