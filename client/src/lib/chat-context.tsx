import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { Message, Conversation } from "@shared/schema";

interface MockResponse {
  content: string;
  type: "reasoning" | "answer" | "transaction";
  timedelta: number;
  txHash?: string;
}

interface ChatContextType {
  messages: (Message & { txHash?: string })[];
  conversations: Conversation[];
  currentConversationId: number | null;
  showReasoningCollapse: boolean;
  isStoredConversation: boolean;
  sendMessage: (content: string) => void;
  setCurrentConversationId: (id: number | null) => void;
  startNewConversation: () => void;
  onMessageTypingComplete: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<(Message & { txHash?: string })[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>(
    [...storedConversations].sort(
      (a, b) => (b.timestamp?.getTime() || 0) - (a.timestamp?.getTime() || 0)
    )
  );
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const [showReasoningCollapse, setShowReasoningCollapse] = useState(false);
  const [isStoredConversation, setIsStoredConversation] = useState(false);

  const messageQueueRef = useRef<MockResponse[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const processNextMessage = () => {
    if (messageQueueRef.current.length === 0) return;

    const nextMessage = messageQueueRef.current[0];
    const messageId = messages.length + 1;

    const agentMessage: Message & { txHash?: string } = {
      id: messageId,
      content: nextMessage.content,
      type: nextMessage.type,
      isUser: false,
      conversationId: currentConversationId?.toString() || "new",
      timestamp: new Date(),
      txHash: nextMessage.txHash,
    };

    setMessages(prev => [...prev, agentMessage]);
  };

  const onMessageTypingComplete = () => {
    // Remove the processed message from the queue
    messageQueueRef.current.shift();

    // If there are more messages, schedule the next one with its delay
    if (messageQueueRef.current.length > 0) {
      const nextMessage = messageQueueRef.current[0];
      timeoutRef.current = setTimeout(() => {
        processNextMessage();
      }, nextMessage.timedelta);
    }
  };

  const sendMessage = (content: string) => {
    clearTimer();
    setIsStoredConversation(false);

    const userMessage: Message & { txHash?: string } = {
      id: messages.length,
      content,
      type: "answer",
      isUser: true,
      conversationId: currentConversationId?.toString() || "new",
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setShowReasoningCollapse(false);

    if (!currentConversationId) {
      const newConversation: Conversation = {
        id: conversations.length + 1,
        title: content.slice(0, 30) + "...",
        timestamp: new Date(),
      };
      setConversations(prev => [newConversation, ...prev]);
      setCurrentConversationId(newConversation.id);
    }

    // Reset message queue
    messageQueueRef.current = [...mockResponsesData];

    // Start first message with its delay
    if (messageQueueRef.current.length > 0) {
      const firstMessage = messageQueueRef.current[0];
      timeoutRef.current = setTimeout(() => {
        processNextMessage();
      }, firstMessage.timedelta);
    }
  };

  const loadStoredMessages = (conversationId: number) => {
    const storedConversationMessages = storedMessages[conversationId];
    if (storedConversationMessages) {
      clearTimer();
      setMessages(storedConversationMessages);
      setShowReasoningCollapse(false);
      setIsStoredConversation(true);
    }
  };

  const handleSetCurrentConversationId = (id: number | null) => {
    clearTimer();
    setCurrentConversationId(id);
    if (id !== null) {
      loadStoredMessages(id);
    }
  };

  const startNewConversation = () => {
    handleSetCurrentConversationId(null);
  };

  useEffect(() => {
    return () => clearTimer();
  }, []);

  return (
    <ChatContext.Provider
      value={{
        messages,
        conversations,
        currentConversationId,
        showReasoningCollapse,
        isStoredConversation,
        sendMessage,
        setCurrentConversationId: handleSetCurrentConversationId,
        startNewConversation,
        onMessageTypingComplete,
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

const storedConversations: Conversation[] = []; // Replace with actual data
const storedMessages: { [key: number]: (Message & { txHash?: string })[] } = {}; // Replace with actual data

// Mock response data
export const mockResponsesData: MockResponse[] = [
  {
    content: "I have received the request to create an AI-generated music video based on the song 'Get Paid: The Nevermind AI Agent Anthem'. I will split the task into several steps: generating the song, generating the script, creating images, generating videos, and finally compiling everything into a single MP4 file.",
    type: "reasoning",
    timedelta: 789
  },
  {
    content: "I have checked the subscription plan for the Song Generator (did:nv:0c63e2e0449afd88...). There's insufficient balance, so I need to purchase credits. The agent accepts payments in VIRTUAL; I must perform a swap to acquire 1 VIRTUAL.",
    type: "reasoning",
    timedelta: 1721
  },
  {
    content: "Swap completed to obtain 1 VIRTUAL.",
    type: "transaction",
    txHash: "0x1d465ab71cd0c77252f4aade9ea12d7b9f06e62d154a89e863c1ba0ef28257ef",
    timedelta: 5202
  },
  {
    content: "Credits purchased for 1 VIRTUAL under the Song Generator plan. The credit balance has been updated successfully.",
    type: "reasoning",
    timedelta: 1240
  },
  {
    content: "Here is the generated song 'Get Paid The Nevermind AI Agent Anthem': https://cdnc.ttapi.io/2025-02-24/16f41d8d-7411-4d6a-b528-d408acca8970.mp3",
    type: "answer",
    timedelta: 2311
  }
];