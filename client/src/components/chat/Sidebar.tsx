import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Plus, Moon, Sun } from "lucide-react";
import { Conversation } from "@shared/schema";
import { cn } from "@/lib/utils";
import { useChat } from "@/lib/chat-context";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/theme-context";

interface SidebarProps {
  conversations: Conversation[];
}

export default function Sidebar({ conversations }: SidebarProps) {
  const { currentConversationId, setCurrentConversationId, startNewConversation } = useChat();
  const { theme, setTheme } = useTheme();

  return (
    <div className="w-64 h-full flex flex-col bg-sidebar text-sidebar-foreground">
      <div className="p-4 border-b border-sidebar-border/50">
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
              fill="currentColor"
            ></path>
            <path
              d="M21.7369 19.9002L10.8686 10.0011V0L21.7369 9.89908L32.404 0V10.0011L21.7369 19.9002Z"
              fill="currentColor"
            ></path>
          </svg>
          <span className="font-semibold text-lg">Nevermined</span>
        </div>
      </div>
      <div className="p-4 border-b border-sidebar-border/50 flex justify-between items-center">
        <h2 className="font-semibold text-sm">Conversations</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={startNewConversation}
          className="h-6 w-6 hover:bg-sidebar-accent"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {conversations.map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => setCurrentConversationId(conversation.id)}
              className={cn(
                "w-full p-3 rounded-lg flex flex-col items-start gap-1 hover:bg-sidebar-accent transition-colors text-left",
                currentConversationId === conversation.id && "bg-sidebar-accent"
              )}
            >
              <div className="flex items-center gap-2 w-full">
                <MessageSquare className="w-4 h-4 shrink-0" />
                <span className="text-sm font-medium truncate">{conversation.title}</span>
              </div>
              <span className="text-xs text-sidebar-foreground/70 pl-6">
                {format(new Date(conversation.timestamp), "MMM d, yyyy 'at' h:mm a")}
              </span>
            </button>
          ))}
        </div>
      </ScrollArea>
      <div className="p-4 border-t border-sidebar-border/50">
        <Button
          variant="ghost"
          size="sm"
          className="w-full flex items-center justify-center gap-2 hover:bg-sidebar-accent"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? (
            <>
              <Sun className="h-4 w-4" />
              <span>Light mode</span>
            </>
          ) : (
            <>
              <Moon className="h-4 w-4" />
              <span>Dark mode</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}