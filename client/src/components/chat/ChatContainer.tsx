import { useChat } from "@/lib/chat-context";
import { ScrollArea } from "@/components/ui/scroll-area";
import MessageGroup from "./MessageGroup";
import ChatInput from "./ChatInput";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Sidebar from "./Sidebar";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Message {
  type: string;
  isUser: boolean;
  // ... other message properties
}

export default function ChatContainer() {
  const { messages, conversations } = useChat();
  const isEmpty = messages.length === 0;
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Group messages by type sequences
  const messageGroups = messages.reduce((groups: Message[][], message) => {
    const lastGroup = groups[groups.length - 1];

    if (
      lastGroup && 
      lastGroup[0].type === message.type && 
      !lastGroup[0].isUser && 
      !message.isUser
    ) {
      lastGroup.push(message);
    } else {
      groups.push([message]);
    }

    return groups;
  }, []);

  return (
    <div className="flex h-screen">
      <div
        className={cn(
          "transition-all duration-300 ease-in-out",
          sidebarOpen ? "w-64" : "w-0",
          "md:relative absolute z-50 h-full bg-background"
        )}
      >
        {sidebarOpen && (
          <>
            <Sidebar conversations={conversations} />
            <Separator orientation="vertical" className="absolute right-0 top-0 h-full opacity-50" />
          </>
        )}
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className={cn(
          "absolute top-4 transition-all duration-300 ease-in-out z-50",
          sidebarOpen ? "left-64" : "left-4"
        )}
      >
        {sidebarOpen ? (
          <ChevronLeft className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </Button>

      <div className={cn(
        "flex-1 flex flex-col bg-muted/80",
        "transition-all duration-300 ease-in-out"
      )}>
        <div className="p-4 flex justify-end items-center bg-muted/80">
          <Avatar className="cursor-pointer">
            <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=user" />
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
        </div>

        {!isEmpty && (
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messageGroups.map((group, index) => (
                <MessageGroup key={index} messages={group} />
              ))}
            </div>
          </ScrollArea>
        )}

        <ChatInput />
      </div>
    </div>
  );
}