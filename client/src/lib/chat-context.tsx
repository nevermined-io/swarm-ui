import { createContext, useContext, useState, ReactNode } from "react";
import type { Message, Conversation } from "@shared/schema";

interface MockResponse {
  content: string;
  type: "reasoning" | "answer";
  delay: number; // delay in milliseconds before showing this message
}

const mockResponses: MockResponse[] = [
  { 
    content: "I'm analyzing your request and gathering relevant visual examples...", 
    type: "reasoning",
    delay: 1000
  },
  { 
    content: "Processing multiple image sources and preparing the visual layout...", 
    type: "reasoning",
    delay: 2000
  },
  { 
    content: "Analyzing composition and aesthetic elements in the generated images...", 
    type: "reasoning",
    delay: 3000
  },
  { 
    content: `Here are some example images I've generated:

https://v3.fal.media/files/koala/9SMgfGhSGfvX1EQn5mB-w.png
https://v3.fal.media/files/kangaroo/TeoR3DPS_EbDpMR-jk7wE.png
https://v3.fal.media/files/panda/85CanDFiF8oBVOVVg5SYc.png
https://v3.fal.media/files/elephant/HQhOC153qLeoiPU9n_Qjt.png
https://v3.fal.media/files/rabbit/sebaq6NPwXmMoGubDxoQ6.png
https://v3.fal.media/files/rabbit/h9FZ4XaqqvrKoHcLPzGEe.png
https://v3.fal.media/files/zebra/TvQZpdAO_skJbn0NQoqlg.png
https://v3.fal.media/files/koala/_fC63XVgw6EmoWFKKtHbN.png
https://v3.fal.media/files/kangaroo/2hzFUFYg0xRQ1BYr-GnMi.png
https://v3.fal.media/files/elephant/qz285LaTtdG98b8dJKRaa.png
https://v3.fal.media/files/rabbit/nfp94z2VN2asLOetX2spZ.png
https://v3.fal.media/files/panda/TBdxoUGIoyba3_OnaNhPT.png`, 
    type: "answer",
    delay: 4000
  },
  {
    content: "Now, let me fetch some audio examples for you...",
    type: "reasoning",
    delay: 6000
  },
  {
    content: "I've found an interesting audio clip about this topic: https://cdnc.ttapi.io/2025-02-19/3f8b0ffe-c90b-4de0-8e46-ed6929bb323d.mp3",
    type: "answer",
    delay: 8000
  },
  {
    content: "Let me also show you a video demonstration...",
    type: "reasoning",
    delay: 10000
  },
  {
    content: "Here's a fascinating video that illustrates the concepts: https://nvm-music-video-swarm-bucket.s3.amazonaws.com/blockchain_dreams_of_a_young_entrepreneur.mp4",
    type: "answer",
    delay: 12000
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
      }, response.delay);
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