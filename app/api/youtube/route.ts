import { NextRequest, NextResponse } from "next/server";
import { parseISO8601Duration } from "@/lib/utils";

function parseDurationText(str: string): number {
  if (!str) return 0;
  const parts = str.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}

/**
 * Direct web fallback to extract public YouTube playlist details
 * without requiring a Google Cloud YouTube API key.
 */
async function fetchPlaylistViaWeb(playlistId: string) {
  const url = `https://www.youtube.com/playlist?list=${playlistId}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  if (!res.ok) {
    throw new Error(`YouTube responded with HTTP ${res.status}`);
  }

  const html = await res.text();
  const match =
    html.match(/var ytInitialData = ({.*?});<\/script>/) ||
    html.match(/ytInitialData\s*=\s*({.+?});/);

  if (!match) {
    throw new Error("Could not parse YouTube playlist metadata.");
  }

  const data = JSON.parse(match[1]);
  const plTitle =
    data.metadata?.playlistMetadataRenderer?.title ||
    "Imported Course Playlist";

  const channelTitle =
    data.sidebar?.playlistSidebarRenderer?.items?.[1]
      ?.playlistSidebarSecondaryInfoRenderer?.videoOwner?.videoOwnerRenderer
      ?.title?.runs?.[0]?.text || "YouTube Channel";

  const thumbnail =
    data.sidebar?.playlistSidebarRenderer?.items?.[0]
      ?.playlistSidebarPrimaryInfoRenderer?.thumbnailRenderer
      ?.playlistVideoThumbnailRenderer?.thumbnail?.thumbnails?.slice(-1)[0]?.url ||
    data.header?.pageHeaderRenderer?.content?.pageHeaderViewModel?.heroImage
      ?.contentPreviewImageViewModel?.image?.sources?.slice(-1)[0]?.url ||
    "";

  let items: any[] = [];
  try {
    items =
      data.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer
        ?.content?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer
        ?.contents?.[0]?.playlistVideoListRenderer?.contents ||
      data.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer
        ?.content?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer
        ?.contents ||
      [];
  } catch {}

  const finalLectures: any[] = [];
  let totalDurationSec = 0;
  let order = 1;

  for (const item of items) {
    // Modern lockupViewModel
    if (item.lockupViewModel?.contentId) {
      const lvm = item.lockupViewModel;
      const vidId = lvm.contentId;
      const title =
        lvm.metadata?.lockupMetadataViewModel?.title?.content ||
        `Lecture ${order}`;
      const durStr =
        lvm.contentImage?.thumbnailViewModel?.overlays?.[0]
          ?.thumbnailBottomOverlayViewModel?.badges?.[0]
          ?.thumbnailBadgeViewModel?.text || "0:00";
      const dur = parseDurationText(durStr);
      totalDurationSec += dur;

      finalLectures.push({
        videoId: vidId,
        title,
        thumbnail: `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg`,
        durationSec: dur,
        order: order++,
      });
      continue;
    }

    // Classic playlistVideoRenderer
    if (item.playlistVideoRenderer?.videoId) {
      const pvr = item.playlistVideoRenderer;
      const vidId = pvr.videoId;
      const title =
        pvr.title?.runs?.[0]?.text ||
        pvr.title?.simpleText ||
        `Lecture ${order}`;
      const dur = parseInt(pvr.lengthSeconds || "0", 10);
      totalDurationSec += dur;

      finalLectures.push({
        videoId: vidId,
        title,
        thumbnail:
          pvr.thumbnail?.thumbnails?.slice(-1)[0]?.url ||
          `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg`,
        durationSec: dur,
        order: order++,
      });
      continue;
    }
  }

  if (finalLectures.length === 0) {
    throw new Error(
      "No public videos found in this playlist. Please check that the playlist is Public or Unlisted."
    );
  }

  return {
    playlistId,
    title: plTitle,
    channelTitle,
    thumbnail: thumbnail || finalLectures[0].thumbnail,
    itemCount: finalLectures.length,
    totalDurationSec,
    skippedCount: 0,
    items: finalLectures,
  };
}

export async function POST(req: NextRequest) {
  try {
    const youtubeKey =
      req.headers.get("x-youtube-key") || process.env.YOUTUBE_API_KEY || "";

    const body = await req.json();
    const { action, playlistId } = body;

    // Action 1: Test Key
    if (action === "test") {
      if (!youtubeKey.trim()) {
        return NextResponse.json(
          { error: "YouTube API key is missing. Please provide it in Settings." },
          { status: 400 }
        );
      }
      const testRes = await fetch(
        `https://www.googleapis.com/youtube/v3/playlists?part=id&id=PL12345&key=${youtubeKey}`
      );
      if (!testRes.ok) {
        const errorData = await testRes.json().catch(() => ({}));
        const message =
          errorData?.error?.message ||
          `YouTube API rejected the key (Status: ${testRes.status})`;
        return NextResponse.json({ error: message }, { status: testRes.status });
      }
      return NextResponse.json({ success: true, message: "YouTube API Key is valid!" });
    }

    // Action 2: Fetch Playlist
    if (action === "fetch_playlist") {
      if (!playlistId) {
        return NextResponse.json(
          { error: "Playlist ID is required." },
          { status: 400 }
        );
      }

      // If key is available, attempt official Google Data API v3
      if (youtubeKey.trim()) {
        try {
          const playlistRes = await fetch(
            `https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&id=${playlistId}&key=${youtubeKey}`
          );

          if (playlistRes.ok) {
            const playlistData = await playlistRes.json();
            if (playlistData.items && playlistData.items.length > 0) {
              const plSnippet = playlistData.items[0].snippet;
              const plTitle = plSnippet.title || "Untitled Playlist";
              const channelTitle = plSnippet.channelTitle || "Unknown Channel";
              const thumbnail =
                plSnippet.thumbnails?.maxres?.url ||
                plSnippet.thumbnails?.high?.url ||
                plSnippet.thumbnails?.medium?.url ||
                plSnippet.thumbnails?.default?.url ||
                "";

              let rawVideos: Array<{
                videoId: string;
                title: string;
                thumbnail: string;
                position: number;
              }> = [];
              let nextPageToken: string | undefined = undefined;
              let skippedCount = 0;
              let pageCount = 0;
              const maxPages = 20;

              do {
                pageCount++;
                const pageUrl: string = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,status&maxResults=50&playlistId=${playlistId}&key=${youtubeKey}${
                  nextPageToken ? `&pageToken=${nextPageToken}` : ""
                }`;

                const itemsRes = await fetch(pageUrl);
                if (itemsRes.ok) {
                  const itemsData = await itemsRes.json();
                  const items = itemsData.items || [];

                  for (const item of items) {
                    const title = item.snippet?.title || "";
                    const videoId = item.snippet?.resourceId?.videoId;
                    const privacy = item.status?.privacyStatus;

                    if (
                      !videoId ||
                      title === "Private video" ||
                      title === "Deleted video" ||
                      privacy === "private"
                    ) {
                      skippedCount++;
                      continue;
                    }

                    const vidThumb =
                      item.snippet?.thumbnails?.high?.url ||
                      item.snippet?.thumbnails?.medium?.url ||
                      item.snippet?.thumbnails?.default?.url ||
                      `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

                    rawVideos.push({
                      videoId,
                      title,
                      thumbnail: vidThumb,
                      position: item.snippet?.position || rawVideos.length,
                    });
                  }
                  nextPageToken = itemsData.nextPageToken;
                } else {
                  break;
                }
              } while (nextPageToken && pageCount < maxPages);

              if (rawVideos.length > 0) {
                const durationMap = new Map<string, number>();
                for (let i = 0; i < rawVideos.length; i += 50) {
                  const batch = rawVideos.slice(i, i + 50);
                  const ids = batch.map((v) => v.videoId).join(",");

                  const vidRes = await fetch(
                    `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${ids}&key=${youtubeKey}`
                  );

                  if (vidRes.ok) {
                    const vidData = await vidRes.json();
                    for (const item of vidData.items || []) {
                      const isoDuration = item.contentDetails?.duration;
                      const durationSec = parseISO8601Duration(isoDuration);
                      durationMap.set(item.id, durationSec);
                    }
                  }
                }

                let totalDurationSec = 0;
                const finalItems = rawVideos.map((v, index) => {
                  const dur = durationMap.get(v.videoId) || 0;
                  totalDurationSec += dur;
                  return {
                    videoId: v.videoId,
                    title: v.title,
                    thumbnail: v.thumbnail,
                    durationSec: dur,
                    order: index + 1,
                  };
                });

                return NextResponse.json({
                  playlistId,
                  title: plTitle,
                  channelTitle,
                  thumbnail,
                  itemCount: finalItems.length,
                  totalDurationSec,
                  skippedCount,
                  items: finalItems,
                });
              }
            }
          }
        } catch (apiErr) {
          console.warn("API fetch error, falling back to direct web scraper:", apiErr);
        }
      }

      // Seamless direct web fallback
      try {
        const directData = await fetchPlaylistViaWeb(playlistId);
        return NextResponse.json(directData);
      } catch (scrapeErr: any) {
        return NextResponse.json(
          {
            error:
              scrapeErr.message ||
              "Could not fetch playlist. Please check that the URL is public or unlisted.",
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({ error: "Invalid action specified." }, { status: 400 });
  } catch (error: any) {
    console.error("YouTube API route error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error occurred." },
      { status: 500 }
    );
  }
}
