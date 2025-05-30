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
 * @property {"reasoning" | "answer" | "transaction" | "nvm-transaction" | "error" | "warning" | "callAgent"} type
 * @property {string} content
 * @property {string} [txHash]
 * @property {{ mimeType: string; parts: string[] }} [artifacts]
 * @property {number} [credits]
 * @property {string} [planDid]
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
    | "nvm-transaction"
    | "error"
    | "warning"
    | "callAgent";
  content: string;
  txHash?: string;
  /**
   * Credits consumed in nvm-transaction
   */
  credits?: number;
  /**
   * Plan DID for nvm-transaction
   */
  planDid?: string;
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
   * Send a message to the orchestrator via backend proxy and return the created task ID.
   * @param content The user message to send.
   * @returns Promise resolving to the task ID.
   */
  async function sendTaskToOrchestrator(content: string): Promise<string> {
    const response = await fetch("/api/orchestrator-task", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input_query: content }),
    });
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

    // Add the user message to the chat
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

    // Call the LLM router before sending to the agent
    let llmAction: "forward" | "no_credit" | "order_plan" | "no_action" =
      "forward";
    let llmReason = "";
    try {
      const resp = await fetch("/api/llm-router", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          history: messages,
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        llmAction = data.action;
        llmReason = data.message || "";
      }
    } catch (e) {
      llmAction = "forward";
    }

    if (llmAction === "no_credit") {
      // Show error message in the chat
      setMessages((prev) => [
        ...prev,
        {
          id: prev.length + 1,
          content: llmReason || "You have no credits. Please top up your plan.",
          type: "error",
          isUser: false,
          conversationId: currentConversationId?.toString() || "new",
          timestamp: new Date(),
        },
      ]);
      return;
    }

    if (llmAction === "order_plan") {
      try {
        const resp = await fetch("/api/order-plan", { method: "POST" });
        const data = await resp.json();

        if (data.txHash) {
          setMessages((prev) => [
            ...prev,
            {
              id: prev.length + 1,
              content: data.message || "Plan ordered successfully.",
              type: "nvm-transaction",
              isUser: false,
              conversationId: currentConversationId?.toString() || "new",
              timestamp: new Date(),
              txHash: data.txHash,
              credits: data.credits,
              planDid: data.planDid,
            },
            {
              id: prev.length + 2,
              content:
                "You can now generate your music video! Write your prompt to continue.",
              type: "answer",
              isUser: false,
              conversationId: currentConversationId?.toString() || "new",
              timestamp: new Date(),
            },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            {
              id: prev.length + 1,
              content: data.message || "Plan ordered successfully.",
              type: "answer",
              isUser: false,
              conversationId: currentConversationId?.toString() || "new",
              timestamp: new Date(),
            },
            {
              id: prev.length + 2,
              content:
                "You can now generate your music video! Write your prompt to continue.",
              type: "answer",
              isUser: false,
              conversationId: currentConversationId?.toString() || "new",
              timestamp: new Date(),
            },
          ]);
        }
      } catch (e) {
        setMessages((prev) => [
          ...prev,
          {
            id: prev.length + 1,
            content: "Error ordering plan.",
            type: "error",
            isUser: false,
            conversationId: currentConversationId?.toString() || "new",
            timestamp: new Date(),
          },
        ]);
      }
      return;
    }

    if (llmAction === "no_action") {
      // Add the LLM's message as an 'answer' type in the chat
      setMessages((prev) => [
        ...prev,
        {
          id: prev.length + 1,
          content: llmReason || "",
          type: "answer",
          isUser: false,
          conversationId: currentConversationId?.toString() || "new",
          timestamp: new Date(),
        },
      ]);
      return;
    }

    // If the LLM says 'forward', follow the normal flow (as now)
    if (!currentConversationId) {
      // Get synthesized title from backend
      let title = content.slice(0, 30) + "...";
      try {
        const resp = await fetch("/api/title/summarize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ history: messages }),
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

    // --- INTEGRATION: Use intent synthesis for agent prompt ---
    let agentPrompt = content;
    try {
      // Call backend to synthesize the user's intent from the conversation history
      const synthRes = await fetch("/api/intent/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history: messages }),
      });
      if (synthRes.ok) {
        const data = await synthRes.json();
        if (data.intent) agentPrompt = data.intent;
      }
    } catch (e) {
      // If synthesis fails, fallback to last message
      agentPrompt = content;
    }
    // --------------------------------------------------------

    try {
      // Send the synthesized intent (or fallback) to the agent
      const taskId = await sendTaskToOrchestrator(agentPrompt);

      // Clean up previous SSE connection if any
      if (sseUnsubscribeRef.current) {
        sseUnsubscribeRef.current();
      }

      // Subscribe to SSE for this task
      sseUnsubscribeRef.current = subscribeToTaskEvents(taskId, (data) => {
        const agentMessage: FullMessage = {
          id: messages.length + 1,
          content: data.content,
          type: data.type || "answer",
          isUser: false,
          conversationId: currentConversationId?.toString() || "new",
          timestamp: new Date(),
          txHash: data.txHash,
          artifacts: data.artifacts,
          credits: data.credits,
          planDid: data.planDid,
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
    // Clean up SSE connection when changing conversation (TODO: remove this)
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
      // Clean up SSE connection on unmount (TODO: remove this)
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
