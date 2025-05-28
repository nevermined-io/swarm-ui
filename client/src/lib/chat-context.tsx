import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import { Message, Conversation } from "@shared/schema";

/**
 * FullMessage for chat context, compatible with all message types including 'warning'.
 * @typedef {Object} FullMessage
 * @property {number} id
 * @property {string} conversationId
 * @property {Date | null} timestamp
 * @property {boolean} isUser
 * @property {"reasoning" | "answer" | "transaction" | "error" | "warning" | "callAgent"} type
 * @property {string} content
 * @property {string} [txHash]
 * @property {{ mimeType: string; parts: string[] }} [artifacts]
 */
export interface FullMessage {
  id: number;
  conversationId: string;
  timestamp: Date | null;
  isUser: boolean;
  type:
    | "reasoning"
    | "answer"
    | "transaction"
    | "error"
    | "warning"
    | "callAgent";
  content: string;
  txHash?: string;
  /**
   * Optional artifacts for media or extra data (images, audio, video, text, etc)
   * @type {{ mimeType: string; parts: string[] }}
   */
  artifacts?: {
    mimeType: string;
    parts: string[];
  };
}

interface ChatContextType {
  messages: FullMessage[];
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
  const [messages, setMessages] = useState<FullMessage[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>(
    [...storedConversations].sort(
      (a, b) => (b.timestamp?.getTime() || 0) - (a.timestamp?.getTime() || 0)
    )
  );
  const [currentConversationId, setCurrentConversationId] = useState<
    number | null
  >(null);
  const [showReasoningCollapse, setShowReasoningCollapse] = useState(false);
  const [isStoredConversation, setIsStoredConversation] = useState(false);

  const messageQueueRef = useRef<any[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sseUnsubscribeRef = useRef<null | (() => void)>(null);

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

    const agentMessage: FullMessage = {
      id: messageId,
      content: nextMessage.content,
      type: nextMessage.type,
      isUser: false,
      conversationId: currentConversationId?.toString() || "new",
      timestamp: new Date(),
      txHash: nextMessage.txHash,
    };

    setMessages((prev) => {
      // Avoid duplicates by content, type and txHash
      if (
        prev.some(
          (m) =>
            m.content === agentMessage.content &&
            m.type === agentMessage.type &&
            m.txHash === agentMessage.txHash
        )
      ) {
        return prev;
      }
      // If a final message with txHash arrives, remove the previous pending message with the same content and type
      if (agentMessage.txHash) {
        return [
          ...prev.filter(
            (m) =>
              !(
                m.content === agentMessage.content &&
                m.type === agentMessage.type &&
                !m.txHash
              )
          ),
          agentMessage,
        ];
      }
      return [...prev, agentMessage];
    });
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

  /**
   * Send a message to the orchestrator and return the created task ID.
   * @param content The user message to send.
   * @returns Promise resolving to the task ID.
   */
  async function sendTaskToOrchestrator(content: string): Promise<string> {
    const response = await fetch(
      "https://2s3jvaxtourejf4vxorc0hkvk3xosbvhnjobdramnox9kinsnc.proxy.testing.nevermined.app/api/v1/agents/did:nv:6f8f6b28e83a97ae789b2387681cc7d82baddaf2f20ae939bbebe15f3d84e2c8/tasks",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer eyJhbGciOiJkaXIiLCJlbmMiOiJBMTI4Q0JDLUhTMjU2In0..HaHK74__bRVaKsYq6oZR5g.m2fQrTq0MyEogC6HW21RV9VDRGXMXRM3G-XanCnNo7sHvDrs3fRj0dSnDX8Cka7UxtayHzByBQyymeQ24-rYIQkU23_humytSnA7Tghr0--OTF0B8C3idcvt3U2DoBWPWR0Gq8iXIm-O6bnrDuB8322jTon5B8S7dAlKxOKhA29W-9Hw71jk41TLTID1OmD6pUrImpfM7C_PcdCrWaLt0KGIbzr2_UeEbAGIu8YVyXHlBHpxP7hN82mWQd9jko9nT2yAYJQHVcgJhKHrug1SZ1kzFl6q88qUEeeEPpBflBNGI7Oci1aSYsIxHSyD2_mMaP6VnrYVOZX4YVZrY-RCf4kNq5d_159upWIawf_e2PwZQ6lAy5OzZI3YwC3Q3gLXGGZj_KKdZr5X347CKnB_lRlz5uSUbAHnliINBp-WYRhpsWbM9-slnwLb3QS7WlGsF4YuhB8IeztUlnWW2FML0z-73is9cK7xAALBDuiOZ70qULa9ZNMt-HvPFUvs-LP26JE_oM0JsZ7QX1wQfT_zfDXu8PAnwd8MGrRXpouE6a57WvP1vTvk3dzPxs7KBssBsJ0t11ThdbkVvCpeH0lfkL2gsPP_6OPk-F12Q8sLPFhdvw-POULKGNbQa8IdH7HsvbXxq_S7OZG6NKIDo6ItsK6jz8gpjidIX2wMRTsbojl4lq6wMi_rjN8xb_N1uipM_SDY5OouuIL4K1OU6PSOZT5Cv46_LhBMH3EnO_Sjzwwr37synDNqWyvfYVm7vneDZUVDQaqsqsLmlOy6SyUGVaxsNrY2O8m_H1GCkoFguezLpHddre9Dl-jer7p7b0GchNXyeJnO5Nf9kGY6343YaFolg11wdIQFe7JjOg2dTdCK1OI-o80ZEwhe55El8OajVbk-DXZtR1B3dKa7dhZE4e4uuPpAcpeOuTH50AzbGiAe73DA5vwPZWEAKUKrWMbH-RnBGmLqOXhuETrhTY2PiIcgRjWFgMMR6w2W-jhr5Ya2JPvu_0C0hKh4WPvp5sqqBMcK3RV55B4ylvkloxmQOPuHUAI7tMcTPmXjydsRvaQ.h1kF8Pmu9sHtBafx9qYVNA`,
        },
        body: JSON.stringify({ input_query: content }),
      }
    );
    if (!response.ok) throw new Error("Failed to send message to orchestrator");
    const data = await response.json();
    return data.task.task_id;
  }

  /**
   * Subscribe to SSE events for a given task ID.
   * @param taskId The task ID to subscribe to.
   * @param onMessage Callback for each message event.
   * @returns Function to close the SSE connection.
   */
  function subscribeToTaskEvents(
    taskId: string,
    onMessage: (data: any) => void
  ): () => void {
    const eventSource = new EventSource(
      `http://localhost:3001/tasks/events/${taskId}`
    );
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      onMessage(data);
    };
    eventSource.onerror = () => {
      eventSource.close();
    };
    return () => eventSource.close();
  }

  const sendMessage = async (content: string) => {
    clearTimer();
    setIsStoredConversation(false);

    const userMessage: FullMessage = {
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
      // Get synthesized title from backend
      let title = content.slice(0, 30) + "...";
      try {
        const resp = await fetch("/api/title/summarize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input: content }),
        });
        if (resp.ok) {
          const data = await resp.json();
          if (data.title) title = data.title;
        }
      } catch (e) {
        console.error(e);
      }
      const newConversation: Conversation = {
        id: conversations.length + 1,
        title,
        timestamp: new Date(),
      };
      setConversations((prev) => [newConversation, ...prev]);
      setCurrentConversationId(newConversation.id);
    }

    // Real orchestrator integration
    try {
      const taskId = await sendTaskToOrchestrator(content);

      // Clean up previous SSE connection if any
      if (sseUnsubscribeRef.current) {
        sseUnsubscribeRef.current();
      }

      // Subscribe to SSE for this task
      sseUnsubscribeRef.current = subscribeToTaskEvents(taskId, (data) => {
        // You may need to adapt this depending on the event structure
        const agentMessage: FullMessage = {
          id: messages.length + 1,
          content: data.content,
          type: data.type || "answer",
          isUser: false,
          conversationId: currentConversationId?.toString() || "new",
          timestamp: new Date(),
          txHash: data.txHash,
          artifacts: data.artifacts,
        };
        setMessages((prev) => {
          // Avoid duplicates by content, type and txHash
          if (
            prev.some(
              (m) =>
                m.content === agentMessage.content &&
                m.type === agentMessage.type &&
                m.txHash === agentMessage.txHash
            )
          ) {
            return prev;
          }
          // If a final message with txHash arrives, remove the previous pending message with the same content and type
          if (agentMessage.txHash) {
            return [
              ...prev.filter(
                (m) =>
                  !(
                    m.content === agentMessage.content &&
                    m.type === agentMessage.type &&
                    !m.txHash
                  )
              ),
              agentMessage,
            ];
          }
          return [...prev, agentMessage];
        });
      });
    } catch (error) {
      // Handle error (show error message, etc.)
      console.error(error);
    }
  };

  const loadStoredMessages = (conversationId: number) => {
    const storedConversationMessages = storedMessages[conversationId];
    if (storedConversationMessages) {
      clearTimer();
      setMessages(storedConversationMessages as FullMessage[]);
      setShowReasoningCollapse(false);
      setIsStoredConversation(true);
    }
  };

  const handleSetCurrentConversationId = (id: number | null) => {
    clearTimer();
    setCurrentConversationId(id);
    // Clean up SSE connection when changing conversation
    if (sseUnsubscribeRef.current) {
      sseUnsubscribeRef.current();
      sseUnsubscribeRef.current = null;
    }
    if (id !== null) {
      loadStoredMessages(id);
    }
  };

  const startNewConversation = () => {
    handleSetCurrentConversationId(null);
  };

  useEffect(() => {
    return () => {
      clearTimer();
      // Clean up SSE connection on unmount
      if (sseUnsubscribeRef.current) {
        sseUnsubscribeRef.current();
        sseUnsubscribeRef.current = null;
      }
    };
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
const storedMessages: { [key: number]: FullMessage[] } = {}; // Replace with actual data
