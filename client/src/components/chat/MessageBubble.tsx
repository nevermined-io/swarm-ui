import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Message } from "@shared/schema";
import { useEffect, useState } from "react";

interface MessageBubbleProps {
  message: Message;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const [displayText, setDisplayText] = useState("");
  const words = message.content.split(" ");
  
  useEffect(() => {
    if (!message.isUser) {
      let currentWordIndex = 0;
      const interval = setInterval(() => {
        if (currentWordIndex < words.length) {
          setDisplayText(words.slice(0, currentWordIndex + 1).join(" "));
          currentWordIndex++;
        } else {
          clearInterval(interval);
        }
      }, 200);
      return () => clearInterval(interval);
    } else {
      setDisplayText(message.content);
    }
  }, [message.content]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "max-w-[80%] rounded-lg p-4",
        message.isUser
          ? "ml-auto bg-primary text-primary-foreground"
          : "mr-auto",
        !message.isUser && message.type === "reasoning"
          ? "bg-muted text-muted-foreground"
          : !message.isUser && message.type === "answer"
          ? "bg-card text-card-foreground"
          : ""
      )}
    >
      {displayText}
    </motion.div>
  );
}
