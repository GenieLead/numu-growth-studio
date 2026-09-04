"use client";

interface AudioTrack {
  id: string;
  kind: string;
  name: string;
  startTimeSec: number;
  durationSec: number;
  volume: number;
}

interface AudioTimelineProps {
  tracks: AudioTrack[];
  totalDuration: number;
  currentTime: number;
  onTrackClick?: (track: AudioTrack) => void;
}

const KIND_CONFIG: Record<string, { label: string; color: string }> = {
  dialogue: { label: "Dialogue", color: "bg-blue-500" },
  voiceover: { label: "Voiceover", color: "bg-green-500" },
  music: { label: "Music", color: "bg-purple-500" },
  ambience: { label: "Ambience", color: "bg-yellow-500" },
  foley: { label: "Foley", color: "bg-orange-500" },
  sfx: { label: "SFX", color: "bg-red-500" },
  impact: { label: "Impact", color: "bg-pink-500" },
};

export function AudioTimeline({
  tracks,
  totalDuration,
  currentTime,
  onTrackClick,
}: AudioTimelineProps) {
  const playhead = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  const kinds = Object.keys(KIND_CONFIG);
  const groupedTracks = kinds
    .map((kind) => ({
      kind,
      ...KIND_CONFIG[kind],
      tracks: tracks.filter((t) => t.kind === kind),
    }))
    .filter((g) => g.tracks.length > 0);

  if (groupedTracks.length === 0) {
    return (
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2">
        <p className="text-[10px] text-neutral-600">
          No audio tracks yet — add voiceover, music, or sound effects
        </p>
      </div>
    );
  }

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-neutral-500 font-medium">AUDIO</span>
        <span className="text-[10px] text-neutral-600 tabular-nums">
          {currentTime.toFixed(1)}s / {totalDuration.toFixed(1)}s
        </span>
      </div>

      {/* Time ruler */}
      <div className="relative h-3 mb-1">
        <div className="absolute inset-0 flex items-end">
          {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
            <div
              key={pct}
              className="absolute bottom-0 w-px h-1.5 bg-neutral-700"
              style={{ left: `${pct * 100}%` }}
            />
          ))}
        </div>
      </div>

      {/* Tracks */}
      <div className="space-y-1 relative">
        {/* Playhead */}
        <div
          className="absolute top-0 bottom-0 w-px bg-accent-lime z-10"
          style={{ left: `${playhead}%` }}
        />

        {groupedTracks.map((group) => (
          <div key={group.kind} className="flex items-center gap-2">
            <span className="text-[9px] text-neutral-500 w-14 truncate shrink-0">
              {group.label}
            </span>
            <div className="flex-1 h-5 bg-neutral-800 rounded relative overflow-hidden">
              {group.tracks.map((track) => {
                const left =
                  totalDuration > 0
                    ? (track.startTimeSec / totalDuration) * 100
                    : 0;
                const width =
                  totalDuration > 0 && track.durationSec
                    ? (track.durationSec / totalDuration) * 100
                    : 10;
                return (
                  <div
                    key={track.id}
                    className={`absolute h-full ${group.color} rounded cursor-pointer opacity-70 hover:opacity-100 transition-opacity`}
                    style={{
                      left: `${left}%`,
                      width: `${Math.min(width, 100 - left)}%`,
                      opacity: track.volume,
                    }}
                    onClick={() => onTrackClick?.(track)}
                    title={`${track.name} (${track.startTimeSec.toFixed(1)}s)`}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
