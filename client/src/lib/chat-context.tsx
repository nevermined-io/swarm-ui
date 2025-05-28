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

interface MockResponse {
  content: string;
  type: "reasoning" | "answer" | "transaction" | "error";
  timedelta: number;
  txHash?: string;
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

  const messageQueueRef = useRef<MockResponse[]>([]);
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
      // Evita duplicados por content, type y txHash
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
      // Si llega un mensaje definitivo con txHash, elimina el pending anterior igual en content y type
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
          // Evita duplicados por content, type y txHash
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
          // Si llega un mensaje definitivo con txHash, elimina el pending anterior igual en content y type
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

// Mock response data
export const mockResponsesData: MockResponse[] = [
  {
    content:
      "I have received the request to create an AI-generated music video based on a thrash metal ballad in the style of Metallica. I will split the task into several steps: generating the song, generating the script, creating images, generating videos, and finally compiling everything into a single MP4 file.",
    type: "reasoning",
    timedelta: 789,
  },
  {
    content:
      "I have checked the subscription plan for the Song Generator (did:nv:0c63e2e0449afd88...). There's insufficient balance, so I need to purchase credits. The agent accepts payments in VIRTUAL; I must perform a swap to acquire 1 VIRTUAL.",
    type: "reasoning",
    timedelta: 1721,
  },
  {
    content: "Swap completed to obtain 1 VIRTUAL.",
    type: "transaction",
    txHash:
      "0x1d465ab71cd0c77252f4aade9ea12d7b9f06e62d154a89e863c1ba0ef28257ef",
    timedelta: 5202,
  },
  {
    content:
      "Credits purchased for 1 VIRTUAL under the Song Generator plan. The credit balance has been updated successfully.",
    type: "reasoning",
    timedelta: 1240,
  },
  {
    content:
      "I'm generating the task for the Song Generator. Minimum credits required: 1. This task may take a while to complete.",
    type: "reasoning",
    timedelta: 840,
  },
  {
    content:
      "Here is the generated song 'Shattered reflections of Silence': https://cdn.ttapi.io/suno/2025-03-28/307287f8-70df-4032-96c3-277e8d5e2be5.mp3",
    type: "answer",
    timedelta: 12311,
  },
  {
    content:
      "Now I will create the music video script. Checking the subscription plan for the Script Generator (did:nv:f6a20637d1bca9ea...). I have found insufficient balance. The agent requires payment in LARRY; I need to swap 0.1 USDC for 100 LARRY.",
    type: "reasoning",
    timedelta: 1536,
  },
  {
    content: "Swap completed to obtain 100 LARRY.",
    type: "transaction",
    txHash:
      "0xf9c7409e15a08cbaa58b9f9b360ec0f020cd33a9c7a9ceefee3ef3a5a257a564",
    timedelta: 4150,
  },
  {
    content:
      "Credits purchased for 100 LARRY under the Script Generator plan. The credit balance has been updated successfully.",
    type: "reasoning",
    timedelta: 2248,
  },
  {
    content:
      "I'm generating the task for the Script Generator. Minimum credits required: 1. This task may take a while to complete.",
    type: "reasoning",
    timedelta: 848,
  },
  {
    content:
      "Script and prompts have been successfully generated for 'Shattered reflections of Silence'. Scenes, camera movements, characters, and locations are defined.",
    type: "answer",
    timedelta: 8207,
  },
  {
    content:
      "Next, I'm moving on to image generation for 8 characters and 5 settings. Checking the subscription plan for the Image/Video Generator (did:nv:61d2abd74124ba6b83b4ce48d1a13d6ce8990cbe3a0c72fed3ff132d0eefabc4...). The balance is insufficient, so I'll purchase credits with 1 USDC.",
    type: "reasoning",
    timedelta: 2912,
  },
  {
    content:
      "Credits purchased with 1 USDC for the Image/Video Generator plan.",
    type: "transaction",
    txHash:
      "0x08c253511b149f1238f7473764ab354af6a49912fe3254d3b885e5b257debed1",
    timedelta: 4985,
  },
  {
    content:
      "I'm generating the image generation task for the Image/Video Generator. Minimum credits required: 1 per image. This task may take a while to complete.",
    type: "reasoning",
    timedelta: 912,
  },
  {
    content:
      "Images for the 6 characters and 7 settings were successfully generated. Here are the final URLs:\n\nCharacters:\n1) https://v3.fal.media/files/panda/X5YwwVFpLLN6Wy_qOZkaU.png\n2) https://v3.fal.media/files/penguin/a9D_YfNE-8bAlhBRX2tKh.png:\n3) https://v3.fal.media/files/kangaroo/bt88ZAR8UG2PaVBYsfeTx.png:\n4) https://v3.fal.media/files/lion/UE_yDtzCM0Bz5newE7Z8I.png:\n5) https://v3.fal.media/files/elephant/d9sTGms8F9Gs-mP0O9-fz.png:\n6) https://v3.fal.media/files/koala/evE-ga_iGdPgxGNSRyw2h.png\n\nSettings:\n1) https://v3.fal.media/files/koala/1izDMDtZQuh4q40y3u3Qd.png\n2) https://v3.fal.media/files/panda/jfHCT6ct22w7vF63hfI0v.png\n3) https://v3.fal.media/files/elephant/GMNVt7BfCTUauKYlo9DL2.png\n4) https://v3.fal.media/files/panda/E7SjRcrp4SFacsNX4DPm9.png\n5) https://v3.fal.media/files/monkey/iressIGoOBXrba-WPCuvk.png\n6) https://v3.fal.media/files/panda/BOiaDpcMu3BHhwDuSt_8C.png\n7) https://v3.fal.media/files/zebra/0wbhYio9YY_FqS6gSSWek.png",
    type: "answer",
    timedelta: 9212,
  },
  {
    content:
      "I am now creating 18 video generation tasks based on the script prompts, each executed concurrently using the same subscription plan. Minimum credits required: 5 per video. This task may take a while to complete.",
    type: "reasoning",
    timedelta: 1054,
  },
  {
    content:
      "All 18 video clips have been generated successfully. The final set is complete and ready for merging with the audio track.",
    type: "answer",
    timedelta: 39124,
  },
  {
    content:
      "I am merging the video tracks without audio first, then I'll add the generated song. Once the final encoding is done, I will upload the MP4 file to S3.",
    type: "reasoning",
    timedelta: 1875,
  },
  {
    content:
      "The final video 'Shattered reflections of Silence' has been uploaded to S3: https://nvm-music-video-swarm-bck.s3.eu-central-1.amazonaws.com/shattered_reflections_of_silence.mp4",
    type: "answer",
    timedelta: 6342,
  },
];
