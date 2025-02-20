import { createContext, useContext, useState, ReactNode } from "react";
import type { Message, Conversation } from "@shared/schema";

interface MockResponse {
  content: string;
  type: "reasoning" | "answer";
  delay: number; // delay in milliseconds before showing this message
}

const mockResponses: MockResponse[] = [
  { 
    content: "I'm analyzing your request using the documentation at https://docs.example.com/analysis and cross-referencing with https://api.example.com/docs...", 
    type: "reasoning",
    delay: 1000 // Show after 1 second
  },
  { 
    content: "Checking multiple reliable sources including https://research.example.com/methods and https://data.example.com/validation...", 
    type: "reasoning",
    delay: 3000 // Show after 3 seconds
  },
  { 
    content: "Based on the findings from https://results.example.com/insights and https://metrics.example.com/analysis...", 
    type: "reasoning",
    delay: 5000 // Show after 5 seconds
  },
  { 
    content: "Here's what I found: The solution is available at https://solution.example.com/guide and you can find additional resources at https://resources.example.com/tutorial", 
    type: "answer",
    delay: 7000 // Show after 7 seconds
  },
  {
    content: "Now I'm examining the visual aspects of blockchain technology...",
    type: "reasoning",
    delay: 9000
  },
  {
    content: "Processing media resources and analyzing visual representations...",
    type: "reasoning",
    delay: 11000
  },
  {
    content: "Here's a fascinating video that illustrates the concepts: https://nvm-music-video-swarm-bucket.s3.amazonaws.com/blockchain_dreams_of_a_young_entrepreneur.mp4",
    type: "answer",
    delay: 13000
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

    // Send messages with their respective delays
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
          type: response.type,
          isUser: false,
          conversationId: currentConversationId?.toString() || "new",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, agentMessage]);
      }, response.delay); // Use the specified delay for each message
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