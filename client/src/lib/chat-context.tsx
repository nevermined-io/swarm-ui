import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useRef,
  useEffect,
} from "react";
import type { Message, Conversation } from "@shared/schema";

interface MockResponse {
  content: string;
  type: "reasoning" | "answer" | "transaction";
  timedelta: number;
  txHash?: string;
}

// Base responses with time deltas
const mockResponsesData: MockResponse[] = [
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
    content: "1 VIRTUAL for Song Generator credits",
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
  },
  {
    content: "Now I will create the music video script. Checking the subscription plan for the Script Generator (did:nv:f6a20637d1bca9ea...). I have found insufficient balance. The agent requires payment in LARRY; I need to swap 0.1 USDC for 100 LARRY.",
    type: "reasoning",
    timedelta: 1536
  },
  {
    content: "0.1 USDC for 100 LARRY Script Generator credits",
    type: "transaction",
    txHash: "0xf9c7409e15a08cbaa58b9f9b360ec0f020cd33a9c7a9ceefee3ef3a5a257a564",
    timedelta: 4150
  },
  {
    content: "Credits purchased for 100 LARRY under the Script Generator plan. The credit balance has been updated successfully.",
    type: "reasoning",
    timedelta: 2248
  },
  {
    content: "Script and prompts have been successfully generated for 'Get Paid The Nevermind AI Agent Anthem'. Scenes, camera movements, characters, and locations are defined.",
    type: "answer",
    timedelta: 3207
  },
  {
    content: "Next, I'm moving on to image generation for 8 characters and 5 settings. Checking the subscription plan for the Image/Video Generator (did:nv:61d2abd74124ba6b83b4ce48d1a13d6ce8990cbe3a0c72fed3ff132d0eefabc4...). The balance is insufficient, so I'll purchase credits with 1 USDC.",
    type: "reasoning",
    timedelta: 2912
  },
  {
    content: "1 USDC for Image/Video Generator credits",
    type: "transaction",
    txHash: "0x08c253511b149f1238f7473764ab354af6a49912fe3254d3b885e5b257debed1",
    timedelta: 4985
  },
  {
    content: "Images for the 8 characters and 5 settings were successfully generated. Here are the final URLs:\n\nCharacters:\n1) https://v3.fal.media/files/monkey/8RSK0cKzJ2EBwwsYAFrDM.png\n2) https://v3.fal.media/files/rabbit/KQglv2FSGvoqhtDxJtpP7.png\n3) https://v3.fal.media/files/elephant/91qBBxfUH_KXvu9ADZN8Z.png\n4) https://v3.fal.media/files/elephant/8Nd-m7QPyVBb-pe-sPV9C.png\n5) https://v3.fal.media/files/rabbit/f6KayDFei9zEpHI-X1HlF.png\n6) https://v3.fal.media/files/monkey/rOk21o1urcghj2E3l34XC.png\n7) https://v3.fal.media/files/kangaroo/OBVk8NwOBiXHBYnC-V0er.png\n8) https://v3.fal.media/files/penguin/nXk8O4auDh58zWQUaU9yE.png\n\nSettings:\n1) https://v3.fal.media/files/rabbit/c-TeR6iPgIoRZYyOqNLJC.png\n2) https://v3.fal.media/files/rabbit/WtTnWcUZuaKvLpjDIFTBZ.png\n3) https://v3.fal.media/files/rabbit/VJS3J9v2HZyjRnZw0Y1qT.png\n4) https://v3.fal.media/files/kangaroo/QY50O5UDii_NtWd7LCV8K.png\n5) https://v3.fal.media/files/zebra/lwUb-WaWXWc911-KGt-4n.png",
    type: "answer",
    timedelta: 9212
  },
  {
    content: "I am now creating 22 video generation tasks based on the script prompts, each executed concurrently using the same subscription plan.",
    type: "reasoning",
    timedelta: 1054
  },
  {
    content: "All generated videos have been validated successfully. The system confirms completion for each of the 22 tasks.",
    type: "reasoning",
    timedelta: 1387
  },
  {
    content: "All 22 video clips have been generated successfully. The final set is complete and ready for merging with the audio track.",
    type: "answer",
    timedelta: 29124
  },
  {
    content: "I am merging the video tracks without audio first, then I'll add the generated song. Once the final encoding is done, I will upload the MP4 file to S3.",
    type: "reasoning",
    timedelta: 1875
  },
  {
    content: "The final video 'Get Paid The Nevermind AI Agent Anthem' has been uploaded to S3: https://nvm-music-video-swarm-bucket.s3.amazonaws.com/get_paid_the_nevermind_ai_agent_anthem.mp4",
    type: "answer",
    timedelta: 6342
  }
];

// Calculate delays based on time deltas
const mockResponses: MockResponse[] = mockResponsesData.map((response, index) => {
  // Calculate cumulative delay based on all previous messages' time deltas
  const cumulativeDelay = mockResponsesData
    .slice(0, index + 1)
    .reduce((total, msg) => total + msg.timedelta, 0);

  return {
    ...response,
    delay: cumulativeDelay,
  };
});

// Example stored conversations
const storedConversations: Conversation[] = [
  {
    id: 1,
    title: "Video Generation Project",
    timestamp: new Date("2025-02-19T10:00:00"),
  },
  {
    id: 2,
    title: "Audio Processing Demo",
    timestamp: new Date("2025-02-19T11:30:00"),
  },
  {
    id: 3,
    title: "Image Gallery Creation",
    timestamp: new Date("2025-02-19T14:15:00"),
  },
];

// Stored messages for each conversation
const storedMessages: Record<number, Message[]> = {
  1: [
    {
      id: 1,
      content: "Can you help me create a video generation project?",
      type: "answer",
      isUser: true,
      conversationId: "1",
      timestamp: new Date("2025-02-19T10:00:00"),
    },
    {
      id: 2,
      content: `Let me analyze your video generation request...
I'll be following our standard process documented at https://video.nevermined.io/process and using our latest rendering technology described at https://tech.nevermined.io/video-render.

Key aspects we'll consider:
- Resolution and format requirements
- Processing optimization
- Quality assurance steps`,
      type: "reasoning",
      isUser: false,
      conversationId: "1",
      timestamp: new Date("2025-02-19T10:00:10"),
    },
    {
      id: 3,
      content: `Here's a sample video demonstrating our capabilities: https://nvm-music-video-swarm-bucket.s3.amazonaws.com/blockchain_dreams_of_a_young_entrepreneur.mp4

This was created using our advanced generation pipeline. You can find more examples in our gallery at https://gallery.nevermined.io/videos`,
      type: "answer",
      isUser: false,
      conversationId: "1",
      timestamp: new Date("2025-02-19T10:00:20"),
    },
  ],
  2: [
    {
      id: 4,
      content: "Show me some audio processing examples",
      type: "answer",
      isUser: true,
      conversationId: "2",
      timestamp: new Date("2025-02-19T11:30:00"),
    },
    {
      id: 5,
      content: `Analyzing audio processing requirements...

I'll be using our audio processing framework detailed at https://audio.nevermined.io/processing and following best practices from https://best-practices.nevermined.io/audio.

Our focus areas include:
- Sound quality optimization
- Noise reduction
- Format compatibility`,
      type: "reasoning",
      isUser: false,
      conversationId: "2",
      timestamp: new Date("2025-02-19T11:30:10"),
    },
    {
      id: 6,
      content: `Here's a processed audio sample: https://cdnc.ttapi.io/2025-02-19/3f8b0ffe-c90b-4de0-8e46-ed6929bb323d.mp3

This demonstrates our high-quality audio processing capabilities. More examples can be found at https://samples.nevermined.io/audio`,
      type: "answer",
      isUser: false,
      conversationId: "2",
      timestamp: new Date("2025-02-19T11:30:20"),
    },
  ],
  3: [
    {
      id: 7,
      content: "Generate some example images for me",
      type: "answer",
      isUser: true,
      conversationId: "3",
      timestamp: new Date("2025-02-19T14:15:00"),
    },
    {
      id: 8,
      content: `Initiating image generation process...

I'm following our image generation guidelines from https://images.nevermined.io/guidelines and using our latest models described at https://models.nevermined.io/image-gen.

We'll focus on:
- Composition quality
- Style consistency
- Resolution optimization`,
      type: "reasoning",
      isUser: false,
      conversationId: "3",
      timestamp: new Date("2025-02-19T14:15:10"),
    },
    {
      id: 9,
      content: `Here are some generated images:

https://v3.fal.media/files/koala/9SMgfGhSGfvX1EQn5mB-w.png
https://v3.fal.media/files/kangaroo/TeoR3DPS_EbDpMR-jk7wE.png
https://v3.fal.media/files/panda/85CanDFiF8oBVOVVg5SYc.png

You can find more examples in our gallery at https://gallery.nevermined.io/images`,
      type: "answer",
      isUser: false,
      conversationId: "3",
      timestamp: new Date("2025-02-19T14:15:20"),
    },
  ],
};

interface ChatContextType {
  messages: Message[];
  conversations: Conversation[];
  currentConversationId: number | null;
  showReasoningCollapse: boolean;
  isStoredConversation: boolean;
  sendMessage: (content: string) => void;
  setCurrentConversationId: (id: number | null) => void;
  startNewConversation: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>(
    [...storedConversations].sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
    ),
  );
  const [currentConversationId, setCurrentConversationId] = useState<
    number | null
  >(null);
  const [showReasoningCollapse, setShowReasoningCollapse] = useState(false);
  const [isStoredConversation, setIsStoredConversation] = useState(false);
  const timeoutsRef = useRef<number[]>([]);

  // Clear all pending timeouts
  const clearPendingTimeouts = () => {
    timeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    timeoutsRef.current = [];
  };

  const loadStoredMessages = (conversationId: number) => {
    const storedConversationMessages = storedMessages[conversationId];
    if (storedConversationMessages) {
      clearPendingTimeouts(); // Clear any pending message generation
      setMessages(storedConversationMessages);
      setShowReasoningCollapse(false);
      setIsStoredConversation(true);
    }
  };

  const handleSetCurrentConversationId = (id: number | null) => {
    clearPendingTimeouts(); // Clear pending messages when switching conversations
    setCurrentConversationId(id);
    if (id !== null) {
      loadStoredMessages(id);
    } else {
      setMessages([]);
      setIsStoredConversation(false);
    }
  };

  const startNewConversation = () => {
    handleSetCurrentConversationId(null);
  };

  const sendMessage = (content: string) => {
    clearPendingTimeouts(); // Clear any pending messages before starting new ones
    setIsStoredConversation(false);
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
      setConversations((prev) => [newConversation, ...prev]);
      setCurrentConversationId(newConversation.id);
    }

    // Send messages with their respective cumulative delays
    mockResponses.forEach((response, index) => {
      const timeoutId = window.setTimeout(() => {
        if (
          index > 0 &&
          mockResponses[index - 1].type === "reasoning" &&
          response.type === "answer"
        ) {
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

      timeoutsRef.current.push(timeoutId);
    });
  };

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => clearPendingTimeouts();
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