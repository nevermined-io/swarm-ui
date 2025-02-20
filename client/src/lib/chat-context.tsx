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
  sendMessage: (content: string) => void;
  setCurrentConversationId: (id: number) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);

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

    if (!currentConversationId) {
      const newConversation: Conversation = {
        id: conversations.length + 1,
        title: content.slice(0, 30) + "...",
        timestamp: new Date(),
      };
      setConversations((prev) => [...prev, newConversation]);
      setCurrentConversationId(newConversation.id);
    }

    // Send all reasoning messages first, then the answer
    let delay = 0;
    mockResponses.forEach((response, index) => {
      if (response.type === "reasoning" || index === mockResponses.length - 1) {
        setTimeout(() => {
          const agentMessage: Message = {
            id: messages.length + index + 1,
            content: response.content,
            type: response.type,
            isUser: false,
            conversationId: currentConversationId?.toString() || "new",
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, agentMessage]);
        }, delay);
        delay += 10000; // 10 seconds between each message
      }
    });
  };

  return (
    <ChatContext.Provider
      value={{
        messages,
        conversations,
        currentConversationId,
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