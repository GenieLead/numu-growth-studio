/**
 * Extract key frames from a video URL for AI analysis.
 * Returns base64-encoded JPEG images at evenly-spaced intervals.
 */
export async function extractVideoFrames(
  videoUrl: string,
  numFrames: number = 6
): Promise<{ base64: string; timestamp: number }[]> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.preload = "auto";

    video.onloadedmetadata = () => {
      const duration = video.duration;
      if (!duration || duration === Infinity) {
        reject(new Error("Could not determine video duration"));
        return;
      }

      const interval = duration / (numFrames + 1);
      const frames: { base64: string; timestamp: number }[] = [];
      let currentIndex = 0;

      const captureFrame = () => {
        if (currentIndex >= numFrames) {
          video.remove();
          resolve(frames);
          return;
        }

        const timestamp = interval * (currentIndex + 1);
        video.currentTime = Math.min(timestamp, duration - 0.1);
      };

      video.onseeked = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(video, 0, 0);
            const base64 = canvas.toDataURL("image/jpeg", 0.7);
            frames.push({
              base64,
              timestamp: video.currentTime,
            });
          }
          currentIndex++;
          captureFrame();
        } catch (err) {
          reject(err);
        }
      };

      captureFrame();
    };

    video.onerror = () => {
      reject(new Error("Failed to load video for frame extraction"));
    };

    video.src = videoUrl;
  });
}

/**
 * Convert base64 data URL to a File object for upload.
 */
export function base64ToFile(
  base64: string,
  filename: string,
  mimeType: string = "image/jpeg"
): File {
  const arr = base64.split(",");
  const mime = arr[0].match(/:(.*?);/)?.[1] || mimeType;
  const bstr = atob(arr[1]);
  const u8arr = new Uint8Array(bstr.length);
  for (let i = 0; i < bstr.length; i++) {
    u8arr[i] = bstr.charCodeAt(i);
  }
  return new File([u8arr], filename, { type: mime });
}
