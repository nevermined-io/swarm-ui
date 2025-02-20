import { createContext, useContext, useState, ReactNode } from "react";
import type { Message, Conversation } from "@shared/schema";

const mockResponses = [
  { content: "Let me think about that for a moment...", type: "reasoning" },
  { content: "Based on my analysis, I can help you with that.", type: "reasoning" },
  { content: "Here's what I found: https://example.com", type: "answer" },
  { content: "The solution is quite straightforward.", type: "answer" },
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

    // Mock response after 10 seconds
    setTimeout(() => {
      const mockResponse = mockResponses[Math.floor(Math.random() * mockResponses.length)];
      const agentMessage: Message = {
        id: messages.length + 1,
        content: mockResponse.content,
        type: mockResponse.type,
        isUser: false,
        conversationId: currentConversationId?.toString() || "new",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, agentMessage]);
    }, 10000);
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
