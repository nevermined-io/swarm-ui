import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Message } from "@shared/schema";
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChat } from "@/lib/chat-context";
import VideoPlayer from "./VideoPlayer";
import AudioPlayer from "./AudioPlayer";
import ImageGrid from "./ImageGrid";

interface MessageGroupProps {
  messages: (Message & { txHash?: string })[];
  isFirstGroup?: boolean;
  onFinishTyping?: () => void;
}

export default function MessageGroup({ messages, isFirstGroup, onFinishTyping }: MessageGroupProps) {
  const [displayedMessages, setDisplayedMessages] = useState<string[]>(Array(messages.length).fill(""));
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { showReasoningCollapse, isStoredConversation, onMessageTypingComplete } = useChat();
  const currentMessageRef = useRef<number>(0);
  const isCancelledRef = useRef(false);

  useEffect(() => {
    if (isStoredConversation) {
      setDisplayedMessages(messages.map(m => m.content));
      return;
    }

    // Only process the latest message
    const currentIndex = messages.length - 1;
    const message = messages[currentIndex];

    if (!message || message.isUser) {
      setDisplayedMessages(prev => {
        const newMessages = [...prev];
        if (message) {
          newMessages[currentIndex] = message.content;
        }
        return newMessages;
      });
      return;
    }

    let isCancelled = false;
    currentMessageRef.current = currentIndex;

    const typeMessage = async () => {
      const words = message.content.split(" ");
      for (let i = 0; i <= words.length; i++) {
        if (isCancelled || currentMessageRef.current !== currentIndex) break;

        await new Promise(resolve => setTimeout(resolve, 50));

        setDisplayedMessages(prev => {
          const newMessages = [...prev];
          newMessages[currentIndex] = words.slice(0, i).join(" ");
          return newMessages;
        });
      }

      if (!isCancelled && currentMessageRef.current === currentIndex) {
        onFinishTyping?.();
        onMessageTypingComplete();
      }
    };

    typeMessage();

    return () => {
      isCancelled = true;
    };
  }, [messages, isStoredConversation, onFinishTyping, onMessageTypingComplete]);

  const detectMediaUrl = (text: string) => {
    if (!text) return null;

    const videoRegex = /https?:\/\/[^\s]+\.mp4\b/g;
    const audioRegex = /https?:\/\/[^\s]+\.mp3\b/g;
    const imageRegex = /https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp)\b/g;

    const videoMatch = text.match(videoRegex);
    if (videoMatch) {
      return { type: 'video' as const, urls: [videoMatch[0]] };
    }

    const audioMatch = text.match(audioRegex);
    if (audioMatch) {
      return { type: 'audio' as const, urls: [audioMatch[0]] };
    }

    const imageMatches = text.match(imageRegex);
    if (imageMatches) {
      return { type: 'images' as const, urls: imageMatches };
    }

    return null;
  };

  const createClickableLinks = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    let displayText = text;

    return displayText.split(urlRegex).map((part, index) => {
      if (part.match(urlRegex)) {
        const urlObj = new URL(part);
        let friendlyName = part;


        if (part.match(/\.(jpg|jpeg|png|gif|webp|mp3|mp4)$/i)) {
          friendlyName = urlObj.pathname.split('/').pop() || part;
        } else {
          const domain = urlObj.hostname.replace('www.', '');
          const firstPath = urlObj.pathname.split('/')[1] || '';
          friendlyName = `${domain}${firstPath ? `/${firstPath}` : ''}`;
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

  const isReasoningGroup = !messages[0].isUser && messages[0].type === "reasoning";
  const isAnswerGroup = !messages[0].isUser && messages[0].type === "answer";
  const shouldShowCollapseButton = isReasoningGroup;

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
        messages[0].isUser ? "ml-auto max-w-[80%]" : isAnswerGroup ? "w-full" : "mr-auto max-w-[80%]",
        isFirstGroup && "mt-4"
      )}
    >
      <div
        className={cn(
          "p-4 whitespace-pre-line",
          messages[0].isUser
            ? "user-message bg-primary text-primary-foreground rounded-lg"
            : messages[0].type === "reasoning"
            ? "bg-muted text-muted-foreground rounded-lg"
            : messages[0].type === "transaction"
            ? "bg-green-500/10 text-green-500 border border-green-500/20 rounded-lg font-medium"
            : "text-card-foreground"
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
            const mediaContent = detectMediaUrl(text);
            const message = messages[index];

            if (message?.type === "transaction") {
              const explorerUrl = `https://sepolia.arbiscan.io/tx/${message.txHash}`;
              return (
                <div key={index} className="flex flex-col gap-2">
                  <span className="text-xs font-bold uppercase">Transaction</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{text}</span>
                    <span className="text-sm text-muted-foreground">•</span>
                    <a
                      href={explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm flex items-center gap-1 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {`${message.txHash?.slice(0, 6)}...${message.txHash?.slice(-4)}`}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              );
            }

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
    </motion.div>
  );
}