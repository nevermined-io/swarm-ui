import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Message } from "@shared/schema";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

interface MessageGroupProps {
  messages: Message[];
}

export default function MessageGroup({ messages }: MessageGroupProps) {
  const [displayedMessages, setDisplayedMessages] = useState<string[]>(Array(messages.length).fill(""));
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showCollapseButton, setShowCollapseButton] = useState(false);

  const isReasoningGroup = !messages[0].isUser && messages[0].type === "reasoning";
  const words = messages.map(m => m.content.split(" "));

  // Function to convert URLs in text to clickable links
  const createClickableLinks = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.split(urlRegex).map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  useEffect(() => {
    let intervals: NodeJS.Timeout[] = [];

    messages.forEach((message, messageIndex) => {
      if (!message.isUser) {
        let currentWordIndex = 0;
        const interval = setInterval(() => {
          if (currentWordIndex < words[messageIndex].length) {
            setDisplayedMessages(prev => {
              const newMessages = [...prev];
              newMessages[messageIndex] = words[messageIndex].slice(0, currentWordIndex + 1).join(" ");
              return newMessages;
            });
            currentWordIndex++;
          } else {
            clearInterval(interval);
            // Show collapse button when all reasoning messages are typed
            if (isReasoningGroup && messageIndex === messages.length - 1) {
              setShowCollapseButton(true);
            }
          }
        }, 100); // Faster typing speed
        intervals.push(interval);
      } else {
        setDisplayedMessages(prev => {
          const newMessages = [...prev];
          newMessages[messageIndex] = message.content;
          return newMessages;
        });
      }
    });

    return () => intervals.forEach(clearInterval);
  }, []);

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
        "max-w-[80%]",
        messages[0].isUser ? "ml-auto" : "mr-auto"
      )}
    >
      <div
        className={cn(
          "rounded-lg p-4",
          messages[0].isUser
            ? "bg-primary text-primary-foreground"
            : messages[0].type === "reasoning"
            ? "bg-muted text-muted-foreground"
            : "bg-card text-card-foreground"
        )}
      >
        {isReasoningGroup && showCollapseButton && (
          <Button
            variant="ghost"
            size="sm"
            className="mb-2 -mt-2 -ml-2 hover:bg-transparent"
            onClick={() => setIsCollapsed(true)}
          >
            <ChevronUp className="w-4 h-4" />
          </Button>
        )}
        <div className="space-y-4">
          {displayedMessages.map((text, index) => (
            <div key={index}>{createClickableLinks(text)}</div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}