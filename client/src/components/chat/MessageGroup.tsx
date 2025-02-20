import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Message } from "@shared/schema";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChat } from "@/lib/chat-context";

interface MessageGroupProps {
  messages: Message[];
}

export default function MessageGroup({ messages }: MessageGroupProps) {
  const [displayedMessages, setDisplayedMessages] = useState<string[]>(Array(messages.length).fill(""));
  const [isCollapsed, setIsCollapsed] = useState(false);
  const typedMessagesCount = useRef(0);
  const { showReasoningCollapse } = useChat();

  const isReasoningGroup = !messages[0].isUser && messages[0].type === "reasoning";
  const words = messages.map(m => m.content.split(" "));

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
      displayText = displayText.replace(url, friendlyName);
      links.push({ url, text: friendlyName });
    });

    // Replace URLs with anchor tags
    return links.reduce((acc, { url, text }) => {
      return acc.replace(text, `<a href="${url}" target="_blank" rel="noopener noreferrer" class="font-semibold hover:underline">${text}</a>`);
    }, displayText).split(/(https?:\/\/[^\s]+)/).map((part, index) => {
      if (part.startsWith('<a')) {
        return <span key={index} dangerouslySetInnerHTML={{ __html: part }} onClick={(e) => e.stopPropagation()} />;
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
          }
          typedMessagesCount.current = messageIndex + 1;
        } else {
          setDisplayedMessages(prev => {
            const newMessages = [...prev];
            newMessages[messageIndex] = message.content;
            return newMessages;
          });
          typedMessagesCount.current = messageIndex + 1;
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

  const isAnswerGroup = !messages[0].isUser && messages[0].type === "answer";

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
        {isReasoningGroup && showReasoningCollapse && (
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
            <div key={index}>{text && createClickableLinks(text)}</div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}