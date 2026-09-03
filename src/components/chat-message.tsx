"use client";

import { Bot, User } from "lucide-react";

interface ReferenceAttachment {
  assetId: string;
  url: string;
  name: string;
  mimeType: string;
  kind?: string;
  customName?: string;
}

interface ChatMessageProps {
  role: "user" | "assistant" | "system_event";
  content: string | { text?: string; attachments?: ReferenceAttachment[] };
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  if (role === "system_event") {
    const text = typeof content === "string" ? content : content?.text || "";
    return (
      <div className="flex justify-center py-2">
        <span className="text-xs text-neutral-500 bg-neutral-900 px-3 py-1 rounded-full">{text}</span>
      </div>
    );
  }

  const isUser = role === "user";
  const text = typeof content === "string" ? content : content?.text || "";
  const attachments = typeof content === "object" && content?.attachments ? content.attachments : [];

  return (
    <div className={`flex gap-3 py-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
          isUser ? "bg-neutral-700" : "bg-accent-lime"
        }`}
      >
        {isUser ? (
          <User className="h-4 w-4 text-white" />
        ) : (
          <Bot className="h-4 w-4 text-black" />
        )}
      </div>
      <div className={`max-w-[80%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-2`}>
        {/* Reference thumbnails */}
        {attachments.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {attachments.map((att) => {
              const isImage = att.mimeType?.startsWith("image/");
              const isVideo = att.mimeType?.startsWith("video/");
              return (
                <div key={att.assetId} className="relative rounded-lg overflow-hidden border border-neutral-700 bg-neutral-900">
                  {isImage && <img src={att.url} alt={att.customName || att.name} className="w-32 h-24 object-cover" />}
                  {isVideo && <video src={att.url} className="w-32 h-24 object-cover" muted playsInline />}
                  {!isImage && !isVideo && (
                    <div className="w-32 h-24 bg-neutral-800 flex items-center justify-center text-neutral-500 text-xs">
                      {att.name}
                    </div>
                  )}
                  {(att.customName || att.kind) && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-2 py-1">
                      <p className="text-[10px] text-neutral-300 truncate">
                        {att.customName && <span className="text-accent-lime">@{att.customName} </span>}
                        {att.kind && att.kind !== "reference" && <span className="text-neutral-500">· {att.kind}</span>}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Text */}
        {text && (
          <div
            className={`rounded-lg px-4 py-3 text-sm leading-relaxed ${
              isUser
                ? "bg-neutral-800 text-neutral-100"
                : "bg-neutral-900 border border-neutral-800 text-neutral-200"
            }`}
          >
            <p className="whitespace-pre-wrap">{text}</p>
          </div>
        )}
      </div>
    </div>
  );
}
