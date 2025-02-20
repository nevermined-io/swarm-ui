import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Message } from "@shared/schema";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChat } from "@/lib/chat-context";
import VideoPlayer from "./VideoPlayer";
import AudioPlayer from "./AudioPlayer";
import ImageGrid from "./ImageGrid";

interface MessageGroupProps {
  messages: Message[];
}

export default function MessageGroup({ messages }: MessageGroupProps) {
  const [displayedMessages, setDisplayedMessages] = useState<string[]>(messages.map(m => m.content));
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { showReasoningCollapse } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isReasoningGroup = !messages[0].isUser && messages[0].type === "reasoning";
  const isAnswerGroup = !messages[0].isUser && messages[0].type === "answer";
  const shouldShowCollapseButton = isReasoningGroup && messages.length > 1;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    // Update displayed messages when messages prop changes
    setDisplayedMessages(messages.map(m => m.content));
    scrollToBottom();
  }, [messages]);

  // Function to detect media URLs
  const detectMediaUrl = (text: string): { type: 'video' | 'audio' | 'images', urls: string[] } | null => {
    const videoRegex = /https?:\/\/[^\s]+\.mp4\b/g;
    const audioRegex = /https?:\/\/[^\s]+\.mp3\b/g;
    const imageRegex = /https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp)\b/g;

    const videoMatch = text.match(videoRegex);
    if (videoMatch) {
      return { type: 'video', urls: [videoMatch[0]] };
    }

    const audioMatch = text.match(audioRegex);
    if (audioMatch) {
      return { type: 'audio', urls: [audioMatch[0]] };
    }

    const imageMatches = text.match(imageRegex);
    if (imageMatches) {
      return { type: 'images', urls: imageMatches };
    }

    return null;
  };

  // Function to convert URLs in text to clickable links with anchor text
  const createClickableLinks = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    let displayText = text;
    const links: { url: string, text: string }[] = [];

    // Extract URLs and create friendly names
    text.match(urlRegex)?.forEach((url) => {
      const domain = new URL(url).hostname.replace('www.', '');
      const section = new URL(url).pathname.split('/')[1] || '';
      const friendlyName = `${domain}${section ? `/${section}` : ''}`;
      displayText = displayText.replace(url, `[[LINK:${friendlyName}:${url}]]`);
      links.push({ url, text: friendlyName });
    });

    // Split text by link placeholders and process line breaks
    return displayText.split(/(\[\[LINK:[^:]+:[^\]]+\]\])/).map((part, index) => {
      const linkMatch = part.match(/\[\[LINK:([^:]+):([^\]]+)\]\]/);
      if (linkMatch) {
        const [, text, url] = linkMatch;
        return (
          <a
            key={index}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {text}
          </a>
        );
      }
      // Replace line breaks with <br /> elements and preserve whitespace
      return part.split('\n').map((line, i) => (
        <span key={`${index}-${i}`}>
          {line}
          {i < part.split('\n').length - 1 && <br />}
        </span>
      ));
    });
  };

  if (isCollapsed && isReasoningGroup) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
        onClick={() => setIsCollapsed(false)}
      >
        <ChevronDown className="w-4 h-4" />
        Show reasoning
      </Button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        messages[0].isUser ? "ml-auto max-w-[80%]" : isAnswerGroup ? "w-full" : "mr-auto max-w-[80%]"
      )}
    >
      <div
        className={cn(
          "p-4 whitespace-pre-line",
          messages[0].isUser
            ? "bg-primary text-primary-foreground rounded-lg"
            : messages[0].type === "reasoning"
            ? "bg-muted text-muted-foreground rounded-lg"
            : "text-card-foreground" // No background for answer messages
        )}
      >
        {shouldShowCollapseButton && (
          <Button
            variant="ghost"
            size="sm"
            className="mb-1 -mt-1 -ml-1 hover:bg-transparent"
            onClick={() => setIsCollapsed(true)}
          >
            <ChevronUp className="w-4 h-4" />
          </Button>
        )}
        <div className="space-y-4">
          {displayedMessages.map((text, index) => {
            const mediaContent = text && detectMediaUrl(text);
            return (
              <div key={index}>
                <div className="whitespace-pre-line">
                  {text && createClickableLinks(text)}
                </div>
                {mediaContent?.type === 'video' && (
                  <VideoPlayer src={mediaContent.urls[0]} />
                )}
                {mediaContent?.type === 'audio' && (
                  <AudioPlayer src={mediaContent.urls[0]} />
                )}
                {mediaContent?.type === 'images' && (
                  <ImageGrid images={mediaContent.urls} />
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div ref={messagesEndRef} />
    </motion.div>
  );
}