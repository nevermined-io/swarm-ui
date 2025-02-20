import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare } from "lucide-react";
import { Conversation } from "@shared/schema";
import { cn } from "@/lib/utils";
import { useChat } from "@/lib/chat-context";

interface SidebarProps {
  conversations: Conversation[];
}

export default function Sidebar({ conversations }: SidebarProps) {
  const { currentConversationId, setCurrentConversationId } = useChat();

  return (
    <div className="w-64 bg-background">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-primary"
          >
            <path
              d="M12 2L2 7L12 12L22 7L12 2Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M2 17L12 22L22 17"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M2 12L12 17L22 12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="font-semibold text-lg">Nevermined</span>
        </div>
      </div>
      <div className="p-4 border-b">
        <h2 className="font-semibold text-sm">Conversations</h2>
      </div>
      <ScrollArea className="h-[calc(100vh-140px)]">
        <div className="p-2 space-y-2">
          {conversations.map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => setCurrentConversationId(conversation.id)}
              className={cn(
                "w-full p-3 rounded-lg flex items-center gap-2 hover:bg-muted/50 transition-colors",
                currentConversationId === conversation.id && "bg-muted/50"
              )}
            >
              <MessageSquare className="w-4 h-4" />
              <span className="text-sm truncate">{conversation.title}</span>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}