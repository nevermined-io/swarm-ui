import { cn } from "@/lib/utils";
import { ChevronUp, ExternalLink, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import VideoPlayer from "./VideoPlayer";
import AudioPlayer from "./AudioPlayer";
import ImageGrid from "./ImageGrid";
import type { FullMessage } from "@/lib/chat-types";
import { useState } from "react";
import { motion } from "framer-motion";

/**
 * MessageGroupProps for displaying a group of messages.
 * @typedef {Object} MessageGroupProps
 * @property {FullMessage[]} messages
 * @property {boolean} [isFirstGroup]
 * @property {() => void} [onFinishTyping]
 */
interface MessageGroupProps {
  messages: FullMessage[];
  isFirstGroup?: boolean;
  onFinishTyping?: () => void;
}

// Utility to map mimeType to media type
/**
 * Maps a mimeType to a media type and component
 * @param {string} mimeType
 * @returns {"video" | "audio" | "images" | "text" | null}
 */
function getMediaTypeFromMime(mimeType: string) {
  if (!mimeType) return null;
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("text/")) return "text";
  if (mimeType.startsWith("image/")) return "images";
  return null;
}

export default function MessageGroup({
  messages,
  isFirstGroup,
}: MessageGroupProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Utility to create clickable links
  const createClickableLinks = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.split(urlRegex).map((part, index) => {
      if (part.match(urlRegex)) {
        const urlObj = new URL(part);
        let friendlyName = part;
        const didMatch = part.match(/did:nv:[a-f0-9]+/);
        if (didMatch) {
          friendlyName = didMatch[0];
        } else if (part.match(/\.(jpg|jpeg|png|gif|webp|mp3|mp4)$/i)) {
          friendlyName = urlObj.pathname.split("/").pop() || part;
        } else {
          const domain = urlObj.hostname.replace("www.", "");
          const firstPath = urlObj.pathname.split("/")[1] || "";
          friendlyName = `${domain}${firstPath ? `/${firstPath}` : ""}`;
        }
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {friendlyName}
          </a>
        );
      }
      return part;
    });
  };

  return (
    <div
      className={cn(
        messages[0].isUser
          ? "ml-auto max-w-[80%]"
          : messages[0].type === "answer" || messages[0].type === "final-answer"
          ? "w-full"
          : "mr-auto max-w-[80%]",
        isFirstGroup && "mt-4"
      )}
    >
      {/* Reasoning: Expand/Collapse */}
      {messages[0].type === "reasoning" && isCollapsed ? (
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          onClick={() => setIsCollapsed(false)}
        >
          <ChevronDown className="w-4 h-4" />
          Show reasoning
        </Button>
      ) : (
        <div
          className={cn(
            "p-4 whitespace-pre-line",
            messages[0].isUser
              ? "user-message bg-primary text-primary-foreground rounded-lg"
              : messages[0].type === "reasoning"
              ? "bg-muted text-muted-foreground rounded-lg text-xs relative pl-10 pr-4 py-4"
              : messages[0].type === "transaction"
              ? "bg-green-500/10 text-green-500 border border-green-500/20 rounded-lg font-medium"
              : messages[0].type === "error"
              ? "bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg font-medium p-3"
              : messages[0].type === "warning"
              ? "bg-orange-400/10 text-orange-500 border border-orange-400/20 rounded-lg font-medium p-3"
              : "text-card-foreground"
          )}
        >
          {/* Collapse button for reasoning */}
          {messages[0].type === "reasoning" && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 left-2 -ml-2 hover:bg-transparent"
              onClick={() => setIsCollapsed(true)}
            >
              <ChevronUp className="w-4 h-4" />
            </Button>
          )}
          <div className="space-y-4">
            {messages.map((message, index) => {
              const text = message.content;
              // Check for artifacts if type is 'answer'
              let mediaContent = null;
              if (
                (message.type === "answer" ||
                  message.type === "final-answer") &&
                (message as any).artifacts
              ) {
                const artifacts = (message as any).artifacts;
                const mediaType = getMediaTypeFromMime(artifacts.mimeType);
                if (mediaType && Array.isArray(artifacts.parts)) {
                  mediaContent = { type: mediaType, urls: artifacts.parts };
                }
              }
              if (message.type === "transaction") {
                const explorerUrl = `https://sepolia.arbiscan.io/tx/${message.txHash}`;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="flex flex-col gap-2 relative bg-green-500/10 text-green-500 border border-green-500/20 rounded-lg font-medium p-3"
                  >
                    <div className="flex items-center justify-between w-full gap-2">
                      <span className="text-xs font-bold uppercase whitespace-nowrap">
                        Blockchain Transaction
                      </span>
                      <a
                        href={explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-mono flex items-center gap-1 hover:underline shadow-sm border border-green-200 whitespace-nowrap ml-auto"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {`${message.txHash?.slice(
                          0,
                          6
                        )}...${message.txHash?.slice(-4)}`}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs flex-1">{text}</span>
                    </div>
                  </motion.div>
                );
              }
              if (message.type === "error") {
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="flex flex-col gap-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg font-medium p-3"
                  >
                    <span className="text-xs font-bold uppercase">Error</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{text}</span>
                    </div>
                  </motion.div>
                );
              }
              if (message.type === "warning") {
                return (
                  <div
                    key={index}
                    className="flex flex-col gap-2 bg-orange-400/10 text-orange-500 border border-orange-400/20 rounded-lg font-medium p-3"
                  >
                    <span className="text-xs font-bold uppercase">Warning</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{text}</span>
                    </div>
                  </div>
                );
              }
              if (message.type === "callAgent") {
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="flex flex-col gap-2 bg-blue-100/80 text-blue-800 border border-blue-300 rounded-lg font-medium p-3 relative"
                  >
                    <span className="absolute top-2 left-2 text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded font-semibold shadow-sm border border-blue-300">
                      Agent Call
                    </span>
                    <div className="flex items-center gap-2 mt-6">
                      <span className="text-xs">{text}</span>
                    </div>
                  </motion.div>
                );
              }
              if (
                message.type === "nvm-transaction-user" ||
                message.type === "nvm-transaction-agent"
              ) {
                /**
                 * Render a Nevermined transaction message, differentiating between user-agent and agent-agent transactions.
                 * @param {FullMessage} message
                 */
                const explorerUrl = `https://sepolia.arbiscan.io/tx/${message.txHash}`;
                const credits = Number(message.credits);
                const planDid = message.planDid
                  ? String(message.planDid)
                  : undefined;
                const planUrl = planDid
                  ? `https://testing.nevermined.app/en/plan/${planDid}`
                  : null;
                const isUserTx = message.type === "nvm-transaction-user";
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="flex flex-col gap-2 relative bg-green-500/10 text-green-500 border border-green-500/20 rounded-lg font-medium p-3"
                  >
                    <div className="flex items-center justify-between w-full gap-2">
                      <span className="text-xs font-bold uppercase whitespace-nowrap">
                        {isUserTx
                          ? "NVM Transaction (User ↔ Agent)"
                          : "NVM Transaction (Agent ↔ Agent)"}
                      </span>
                      <div className="flex items-center gap-2 ml-auto">
                        {credits > 0 && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-mono border border-blue-200 whitespace-nowrap">
                            {credits} credit{credits > 1 ? "s" : ""}
                          </span>
                        )}
                        {planUrl && (
                          <a
                            href={planUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-mono border border-gray-200 hover:underline whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Plan
                          </a>
                        )}
                        <a
                          href={explorerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={
                            isUserTx
                              ? "text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-mono flex items-center gap-1 hover:underline shadow-sm border border-green-200 whitespace-nowrap"
                              : "text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded font-mono flex items-center gap-1 hover:underline shadow-sm border border-orange-200 whitespace-nowrap"
                          }
                          onClick={(e) => e.stopPropagation()}
                        >
                          {`${message.txHash?.slice(
                            0,
                            6
                          )}...${message.txHash?.slice(-4)}`}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs flex-1">{text}</span>
                    </div>
                  </motion.div>
                );
              }
              return (
                <div key={index}>
                  <div className="whitespace-pre-line">
                    {text && createClickableLinks(text)}
                  </div>
                  {mediaContent?.type === "video" && (
                    <VideoPlayer src={mediaContent.urls[0]} />
                  )}
                  {mediaContent?.type === "audio" && (
                    <AudioPlayer src={mediaContent.urls[0]} />
                  )}
                  {mediaContent?.type === "images" && (
                    <ImageGrid images={mediaContent.urls} />
                  )}
                  {mediaContent?.type === "text" && (
                    <CollapsibleTextBlock text={mediaContent.urls[0]} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * CollapsibleTextBlock renders a long text in a collapsible, monospaced block.
 * @param {{ text: string }} props
 */
function CollapsibleTextBlock({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const lines = text.split("\n");
  const previewLines = 8;
  const isLong = lines.length > previewLines;
  const displayText = expanded ? text : lines.slice(0, previewLines).join("\n");

  return (
    <div
      className="bg-muted rounded p-2 mt-2 text-xs text-muted-foreground font-mono"
      style={{
        fontFamily: "Courier New, Courier, monospace",
        whiteSpace: "pre",
        overflowX: "auto",
      }}
    >
      {displayText}
      {isLong && (
        <div className="mt-2 text-right">
          <button
            className="text-primary underline text-xs cursor-pointer"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded
              ? "Collapse"
              : `Show more (${lines.length - previewLines} more lines)`}
          </button>
        </div>
      )}
    </div>
  );
}
