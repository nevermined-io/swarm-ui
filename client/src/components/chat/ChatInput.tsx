import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { useChat } from "@/lib/chat-context";
import { motion } from "framer-motion";

export default function ChatInput() {
  const [input, setInput] = useState("");
  const { sendMessage, messages } = useChat();

  const handleSubmit = () => {
    if (input.trim()) {
      sendMessage(input);
      setInput("");
    }
  };

  return (
    <motion.div
      initial={messages.length === 0 ? { y: "-50%" } : false}
      animate={{ y: 0 }}
      className="p-4 border-t bg-background"
    >
      <div className="flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          className="resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />
        <Button onClick={handleSubmit} size="icon">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
}
