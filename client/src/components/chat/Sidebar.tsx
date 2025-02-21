import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Plus } from "lucide-react";
import { Conversation } from "@shared/schema";
import { cn } from "@/lib/utils";
import { useChat } from "@/lib/chat-context";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  conversations: Conversation[];
}

export default function Sidebar({ conversations }: SidebarProps) {
  const { currentConversationId, setCurrentConversationId, startNewConversation } = useChat();

  return (
    <div className="w-64 bg-background">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2">
          <svg
            width="33"
            height="20"
            viewBox="0 0 33 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M10.8683 19.9002L0 10.0011V0L10.8683 9.89908V19.9002Z"
              fill="#ffffff"
            ></path>
            <path
              d="M21.7369 19.9002L10.8686 10.0011V0L21.7369 9.89908L32.404 0V10.0011L21.7369 19.9002Z"
              fill="#ffffff"
            ></path>
          </svg>
          <span className="font-semibold text-lg">Nevermined</span>
        </div>
      </div>
      <div className="p-4 border-b flex justify-between items-center">
        <h2 className="font-semibold text-sm">Conversations</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={startNewConversation}
          className="h-6 w-6"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <ScrollArea className="h-[calc(100vh-140px)]">
        <div className="p-2 space-y-2">
          {conversations.map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => setCurrentConversationId(conversation.id)}
              className={cn(
                "w-full p-3 rounded-lg flex flex-col items-start gap-1 hover:bg-muted/50 transition-colors text-left",
                currentConversationId === conversation.id && "bg-muted/50"
              )}
            >
              <div className="flex items-center gap-2 w-full">
                <MessageSquare className="w-4 h-4 shrink-0" />
                <span className="text-sm font-medium truncate">{conversation.title}</span>
              </div>
              <span className="text-xs text-muted-foreground pl-6">
                {format(new Date(conversation.timestamp), "MMM d, yyyy 'at' h:mm a")}
              </span>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}