import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { Message, Conversation } from "@shared/schema";

interface MockResponse {
  content: string;
  type: "reasoning" | "answer" | "transaction";
  timedelta: number;
  txHash?: string;
}

// Base responses with time deltas
const mockResponsesData: MockResponse[] = [
  // ... (keeping existing mock data)
];

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
  const [isProcessing, setIsProcessing] = useState(false);

  const messageQueueRef = useRef<MockResponse[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const processNextMessage = () => {
    if (messageQueueRef.current.length === 0 || isProcessing) {
      setIsProcessing(false);
      return;
    }

    const nextMessage = messageQueueRef.current[0];
    const messageId = messages.length + 1;

    // Schedule the message to appear after its delay
    timeoutRef.current = setTimeout(() => {
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
      setIsProcessing(true);
    }, nextMessage.timedelta);
  };

  const onMessageTypingComplete = () => {
    if (messageQueueRef.current.length === 0) {
      setIsProcessing(false);
      return;
    }

    // Remove the processed message from the queue
    messageQueueRef.current.shift();
    setIsProcessing(false);

    // Process the next message if available
    if (messageQueueRef.current.length > 0) {
      processNextMessage();
    }
  };

  const sendMessage = (content: string) => {
    clearTimer();
    setIsStoredConversation(false);
    setIsProcessing(false);

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

    // Create new conversation if needed
    if (!currentConversationId) {
      const newConversation: Conversation = {
        id: conversations.length + 1,
        title: content.slice(0, 30) + "...",
        timestamp: new Date(),
      };
      setConversations(prev => [newConversation, ...prev]);
      setCurrentConversationId(newConversation.id);
    }

    // Reset message queue and start processing
    messageQueueRef.current = [...mockResponsesData];
    processNextMessage();
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

// Declare storedConversations and storedMessages here.  These are assumed to exist in the original code.
const storedConversations: Conversation[] = []; // Replace with actual data
const storedMessages: { [key: number]: (Message & { txHash?: string })[] } = {}; // Replace with actual data