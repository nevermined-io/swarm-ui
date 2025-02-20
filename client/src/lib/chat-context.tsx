import { createContext, useContext, useState, ReactNode } from "react";
import type { Message, Conversation } from "@shared/schema";

const mockResponses = [
  { 
    content: "I'm analyzing your request to provide the most accurate information...", 
    type: "reasoning" 
  },
  { 
    content: "Let me check multiple sources to ensure comprehensive coverage...", 
    type: "reasoning" 
  },
  { 
    content: "Based on the available data and current context...", 
    type: "reasoning" 
  },
  { 
    content: "Here's what I found: Check out this helpful resource at https://example.com/guide and this tutorial at https://example.com/tutorial", 
    type: "answer" 
  }
];

interface ChatContextType {
  messages: Message[];
  conversations: Conversation[];
  currentConversationId: number | null;
  showReasoningCollapse: boolean;
  sendMessage: (content: string) => void;
  setCurrentConversationId: (id: number) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const [showReasoningCollapse, setShowReasoningCollapse] = useState(false);

  const sendMessage = (content: string) => {
    const userMessage: Message = {
      id: messages.length,
      content,
      type: "answer",
      isUser: true,
      conversationId: currentConversationId?.toString() || "new",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setShowReasoningCollapse(false);

    if (!currentConversationId) {
      const newConversation: Conversation = {
        id: conversations.length + 1,
        title: content.slice(0, 30) + "...",
        timestamp: new Date(),
      };
      setConversations((prev) => [...prev, newConversation]);
      setCurrentConversationId(newConversation.id);
    }

    // Send messages sequentially
    mockResponses.forEach((response, index) => {
      setTimeout(() => {
        // If we're transitioning from reasoning to answer, show the collapse button
        if (index > 0 && 
            mockResponses[index - 1].type === "reasoning" && 
            response.type === "answer") {
          setShowReasoningCollapse(true);
        }

        const agentMessage: Message = {
          id: messages.length + index + 1,
          content: response.content,
          type: response.type as "reasoning" | "answer",
          isUser: false,
          conversationId: currentConversationId?.toString() || "new",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, agentMessage]);
      }, (index + 1) * 3000); // Send a message every 3 seconds
    });
  };

  return (
    <ChatContext.Provider
      value={{
        messages,
        conversations,
        currentConversationId,
        showReasoningCollapse,
        sendMessage,
        setCurrentConversationId,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}