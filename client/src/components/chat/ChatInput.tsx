import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { useChat } from "@/lib/chat-context";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function ChatInput() {
  const [input, setInput] = useState("");
  const { sendMessage, messages } = useChat();

  const handleSubmit = () => {
    if (input.trim()) {
      sendMessage(input);
      setInput("");
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <motion.div
      initial={isEmpty ? { y: 0 } : false}
      animate={{ y: 0 }}
      className={cn(
        "p-4 bg-muted/80",
        isEmpty
          ? "h-[calc(100vh-64px)] flex flex-col justify-center"
          : "",
      )}
    >
      {isEmpty && (
        <div className="mb-4 text-xl font-semibold w-full max-w-2xl mx-auto">
          Video generator agent
        </div>
      )}
      <div className="relative w-full max-w-2xl mx-auto">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          className="resize-none pr-12 bg-background/50"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />
        <Button
          onClick={handleSubmit}
          size="icon"
          variant="ghost"
          className="absolute right-2 top-1/2 -translate-y-1/2 hover:bg-background/50"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
}