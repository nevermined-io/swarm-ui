import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Message } from "@shared/schema";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChat } from "@/lib/chat-context";
import VideoPlayer from "./VideoPlayer";
import AudioPlayer from "./AudioPlayer";

interface MessageGroupProps {
  messages: Message[];
}

export default function MessageGroup({ messages }: MessageGroupProps) {
  const [displayedMessages, setDisplayedMessages] = useState<string[]>(Array(messages.length).fill(""));
  const [isCollapsed, setIsCollapsed] = useState(false);
  const typedMessagesCount = useRef(0);
  const { showReasoningCollapse } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isReasoningGroup = !messages[0].isUser && messages[0].type === "reasoning";
  const isAnswerGroup = !messages[0].isUser && messages[0].type === "answer";
  const shouldShowCollapseButton = isReasoningGroup && messages.length > 1;

  const words = messages.map(m => m.content.split(" "));

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Function to detect media URLs
  const detectMediaUrl = (text: string): { type: 'video' | 'audio', url: string } | null => {
    const videoRegex = /https?:\/\/[^\s]+\.mp4\b/g;
    const audioRegex = /https?:\/\/[^\s]+\.mp3\b/g;

    const videoMatch = text.match(videoRegex);
    if (videoMatch) {
      return { type: 'video', url: videoMatch[0] };
    }

    const audioMatch = text.match(audioRegex);
    if (audioMatch) {
      return { type: 'audio', url: audioMatch[0] };
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

    // Split text by link placeholders and create elements
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
      return part;
    });
  };

  useEffect(() => {
    async function typeMessages() {
      for (let messageIndex = typedMessagesCount.current; messageIndex < messages.length; messageIndex++) {
        const message = messages[messageIndex];
        if (!message.isUser) {
          const messageWords = words[messageIndex];
          for (let wordIndex = 0; wordIndex < messageWords.length; wordIndex++) {
            await new Promise(resolve => setTimeout(resolve, 50));
            setDisplayedMessages(prev => {
              const newMessages = [...prev];
              newMessages[messageIndex] = messageWords.slice(0, wordIndex + 1).join(" ");
              return newMessages;
            });
            scrollToBottom();
          }
          typedMessagesCount.current = messageIndex + 1;
        } else {
          setDisplayedMessages(prev => {
            const newMessages = [...prev];
            newMessages[messageIndex] = message.content;
            return newMessages;
          });
          typedMessagesCount.current = messageIndex + 1;
          scrollToBottom();
        }
      }
    }

    typeMessages();
  }, [messages.length]);

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
          "p-4",
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
          {displayedMessages.map((text, index) => (
            <div key={index}>
              {text && createClickableLinks(text)}
              {text && detectMediaUrl(text) && (
                detectMediaUrl(text)?.type === 'video' ? (
                  <VideoPlayer src={detectMediaUrl(text)!.url} />
                ) : (
                  <AudioPlayer src={detectMediaUrl(text)!.url} />
                )
              )}
            </div>
          ))}
        </div>
      </div>
      <div ref={messagesEndRef} />
    </motion.div>
  );
}