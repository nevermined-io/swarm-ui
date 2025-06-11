import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import { FullMessage, ChatContextType } from "./chat-types";
import {
  getCurrentBlockNumber,
  sendTaskToOrchestrator,
  updateCreditsAndGetBurnTx,
  getBurnTransaction,
} from "./chat-api";
import { subscribeToTaskEvents } from "./chat-sse";
import { storedConversations, storedMessages } from "./chat-mocks";
import { Conversation } from "@shared/schema";
import {
  llmRouterRequest,
  orderPlanRequest,
  titleSummarizeRequest,
  intentSynthesizeRequest,
  getPlanCostRequest,
} from "./chat-requests";

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
      const { action, message } = await llmRouterRequest(content, messages);
      llmAction = action;
      llmReason = message || "";
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
        setMessages((prev) => [
          ...prev,
          {
            id: prev.length + 1,
            content:
              "I'm ordering a payment plan. Transaction will be completed in a few seconds.",
            type: "reasoning",
            isUser: false,
            conversationId: currentConversationId?.toString() || "new",
            timestamp: new Date(),
          },
        ]);

        const data = await orderPlanRequest();

        if (data.txHash) {
          setMessages((prev) => [
            ...prev,
            {
              id: prev.length + 1,
              content: data.message || "Plan ordered successfully.",
              type: "nvm-transaction-user",
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
        } else if (data.error) {
          setMessages((prev) => [
            ...prev,
            {
              id: prev.length + 1,
              content: data.error || "Error ordering plan.",
              type: "error",
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
        const data = await titleSummarizeRequest(messages);
        if (data.title) title = data.title;
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
      const data = await intentSynthesizeRequest(messages);
      if (data.intent) agentPrompt = data.intent;
    } catch (e) {
      // If synthesis fails, fallback to last message
      agentPrompt = content;
    }
    // --------------------------------------------------------

    try {
      // Send the synthesized intent (or fallback) to the agent
      const blockNumber = await getCurrentBlockNumber();
      const { task } = await sendTaskToOrchestrator(agentPrompt);

      // Clean up previous SSE connection if any
      if (sseUnsubscribeRef.current) {
        sseUnsubscribeRef.current();
      }

      // Subscribe to SSE for this task
      sseUnsubscribeRef.current = subscribeToTaskEvents(
        task.task_id,
        (data) => {
          const agentMessage: FullMessage = {
            id: messages.length + 1,
            content: data.content,
            type:
              data.type === "nvm-transaction-agent"
                ? "nvm-transaction-agent"
                : data.type === "nvm-transaction-user"
                ? "nvm-transaction-user"
                : data.type || "answer",
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

            // If the message is a final answer, return the message pero también lanza la actualización de créditos y burnTx en background
            if (agentMessage.type === "final-answer") {
              (async () => {
                const burnTxData = await updateCreditsAndGetBurnTx(
                  task.task_id
                );
                if (burnTxData) {
                  setMessages((prev) => [
                    ...prev,
                    {
                      id: prev.length + 1,
                      content: `Task completed. ${burnTxData.credits} credits have been deducted from your balance.`,
                      type: "nvm-transaction-user",
                      isUser: false,
                      conversationId:
                        currentConversationId?.toString() || "new",
                      timestamp: new Date(),
                      txHash: burnTxData.txHash,
                      credits: burnTxData.credits,
                      planDid: burnTxData.planDid,
                    },
                  ]);

                  try {
                    const data = await getPlanCostRequest();
                    const planPrice = Number(data.planPrice);
                    const planCredits = Number(data.planCredits);
                    const creditsUsed = Number(burnTxData.credits);
                    const cost =
                      planCredits > 0
                        ? (planPrice / planCredits) * creditsUsed
                        : 0;
                    setMessages((prev) => [
                      ...prev,
                      {
                        id: prev.length + 1,
                        content: `The final cost of your music video has been ${cost.toFixed(
                          2
                        )} USDC.`,
                        type: "usd-info",
                        isUser: false,
                        conversationId:
                          currentConversationId?.toString() || "new",
                        timestamp: new Date(),
                      },
                    ]);
                  } catch (e) {
                    console.error(e);
                  }
                }
              })();
            }
            return [...prev, agentMessage];
          });
        }
      );

      // Find the burn transaction for the current plan and wallet from a given block. Send fromBlock as query parameter.
      const burnTxData = await getBurnTransaction(blockNumber);
      if (burnTxData) {
        setMessages((prev) => [
          ...prev,
          {
            id: prev.length + 1,
            content: `I have sent the task to the agent. It will take a few minutes to complete. ${burnTxData.credits} credits have been deducted from your balance.`,
            type: "nvm-transaction-user",
            isUser: false,
            conversationId: currentConversationId?.toString() || "new",
            timestamp: new Date(),
            txHash: burnTxData.txHash,
            credits: burnTxData.credits,
            planDid: burnTxData.planDid,
          },
        ]);
      }
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
