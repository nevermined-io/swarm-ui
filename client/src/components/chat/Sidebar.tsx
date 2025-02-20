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
    <div className="w-64 border-r bg-card">
      <div className="p-4 border-b">
        <h2 className="font-semibold">Conversations</h2>
      </div>
      <ScrollArea className="h-[calc(100vh-65px)]">
        <div className="p-2 space-y-2">
          {conversations.map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => setCurrentConversationId(conversation.id)}
              className={cn(
                "w-full p-3 rounded-lg flex items-center gap-2 hover:bg-accent transition-colors",
                currentConversationId === conversation.id && "bg-accent"
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
