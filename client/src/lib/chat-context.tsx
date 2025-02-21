import { createContext, useContext, useState, ReactNode, useRef, useEffect } from "react";
import type { Message, Conversation } from "@shared/schema";

interface MockResponse {
  content: string;
  type: "reasoning" | "answer";
  delay: number;
}

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
  }
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
    }
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
    }
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
    }
  ]
};

// Base responses without delays
const mockResponsesData: Omit<MockResponse, "delay">[] = [
  { 
    content: `I'm analyzing your request and gathering relevant visual examples...
    
First, I'll examine the composition guidelines from https://design.nevermined.io/guidelines and cross-reference them with the latest visual trends documented at https://trends.nevermined.io/2025/visual-design.
    
Based on these sources, I'll generate images that align with our brand identity while maintaining artistic coherence.`, 
    type: "reasoning"
  },
  { 
    content: `Processing multiple image sources and preparing the visual layout...
    
The generation process involves several steps:
1. Analyzing reference materials from https://reference.nevermined.io/gallery
2. Applying style transfer algorithms
3. Fine-tuning composition parameters
    
You can learn more about our image generation process at https://docs.nevermined.io/image-generation.`, 
    type: "reasoning"
  },
  { 
    content: `Analyzing composition and aesthetic elements in the generated images...
    
I've evaluated each image against our quality metrics available at https://metrics.nevermined.io/quality-scores and performed detailed color analysis using guidelines from https://colors.nevermined.io/palette-2025.
    
The results show strong alignment with our brand guidelines, particularly in terms of:
- Color harmony
- Compositional balance
- Visual hierarchy
    
For more details about our evaluation process, visit https://evaluation.nevermined.io/process.`, 
    type: "reasoning"
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
https://v3.fal.media/files/panda/TBdxoUGIoyba3_OnaNhPT.png
    
Each image has been optimized for web display. You can find our image optimization guidelines at https://optimization.nevermined.io/web-images.
    
For high-resolution versions or different formats, please visit our media library at https://media.nevermined.io/library.`, 
    type: "answer"
  },
  {
    content: `Now, let me fetch some audio examples for you...
    
I'm searching through our extensive audio database at https://audio.nevermined.io/library and analyzing various samples based on:
- Sound quality metrics
- Emotional resonance
- Technical specifications
    
The selection process is guided by our audio guidelines available at https://guidelines.nevermined.io/audio-production.`,
    type: "reasoning"
  },
  {
    content: `I've found an interesting audio clip about this topic: https://cdnc.ttapi.io/2025-02-19/3f8b0ffe-c90b-4de0-8e46-ed6929bb323d.mp3
    
This audio sample was carefully selected based on criteria outlined at https://criteria.nevermined.io/audio-selection. 
    
You can find more audio samples and related resources at:
- https://samples.nevermined.io/collection
- https://audio.nevermined.io/featured
- https://sounds.nevermined.io/trending
    
For technical specifications and usage guidelines, please refer to https://docs.nevermined.io/audio-usage.`,
    type: "answer"
  },
  {
    content: `Let me also show you a video demonstration...
    
I'm currently:
1. Analyzing video requirements from https://requirements.nevermined.io/video
2. Checking rendering specifications at https://specs.nevermined.io/video-render
3. Applying quality assurance processes detailed at https://qa.nevermined.io/video
    
Our video selection follows strict guidelines for:
- Resolution and bitrate
- Content relevance
- Visual consistency
    
Learn more about our video standards at https://standards.nevermined.io/video.`,
    type: "reasoning"
  },
  {
    content: `Here's a fascinating video that illustrates the concepts: https://nvm-music-video-swarm-bucket.s3.amazonaws.com/blockchain_dreams_of_a_young_entrepreneur.mp4
    
This video was produced following our comprehensive production guidelines available at https://production.nevermined.io/video-guidelines.
    
Additional resources and related content can be found at:
- https://videos.nevermined.io/tutorials
- https://learn.nevermined.io/video-basics
- https://examples.nevermined.io/video-showcase
    
For technical documentation and integration guides, visit https://docs.nevermined.io/video-integration.`,
    type: "answer"
  }
];

// Calculate delays based on content length and add them to the responses
const mockResponses: MockResponse[] = mockResponsesData.map((response, index) => {
  // Calculate cumulative delay based on all previous messages
  const previousMessagesLength = mockResponsesData
    .slice(0, index)
    .reduce((total, msg) => total + msg.content.split(" ").length, 0);

  // Base delay for each word (50ms) plus 1 second between messages
  const cumulativeDelay = (previousMessagesLength * 50) + (index * 1000);

  return {
    ...response,
    delay: cumulativeDelay
  };
});

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
    [...storedConversations].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  );
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const [showReasoningCollapse, setShowReasoningCollapse] = useState(false);
  const [isStoredConversation, setIsStoredConversation] = useState(false);
  const timeoutsRef = useRef<number[]>([]);

  // Clear all pending timeouts
  const clearPendingTimeouts = () => {
    timeoutsRef.current.forEach(timeoutId => window.clearTimeout(timeoutId));
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