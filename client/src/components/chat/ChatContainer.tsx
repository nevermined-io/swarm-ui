import { useChat } from "@/lib/chat-context";
import { ScrollArea } from "@/components/ui/scroll-area";
import MessageGroup from "./MessageGroup";
import ChatInput from "./ChatInput";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Sidebar from "./Sidebar";
import { Separator } from "@/components/ui/separator";
import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Footer from "./Footer";

interface Message {
  type: string;
  isUser: boolean;
  // ... other message properties
}

export default function ChatContainer() {
  const { messages, conversations } = useChat();
  const isEmpty = messages.length === 0;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Set initial sidebar state based on screen width
  useEffect(() => {
    const isMobile = window.innerWidth < 768; // md breakpoint
    setSidebarOpen(!isMobile);
  }, []);

  // Handle scroll within ScrollArea
  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const target = event.target as HTMLDivElement;
    const { scrollTop, scrollHeight, clientHeight } = target;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 10;
    setShowScrollButton(!isNearBottom);
  };

  // Scroll to bottom
  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollArea = scrollAreaRef.current;
      scrollArea.scrollTop = scrollArea.scrollHeight;
    }
  };

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
    <div className="flex min-h-screen bg-background relative">
      {/* Sidebar */}
      <div
        className={cn(
          "transition-all duration-300 ease-in-out h-[calc(100vh-64px)]",
          sidebarOpen ? "w-full md:w-64" : "w-0",
          "fixed md:relative z-40",
        )}
      >
        {sidebarOpen && (
          <div className="h-full relative">
            <Sidebar conversations={conversations} />
            <Separator
              orientation="vertical"
              className="absolute right-0 top-0 h-full opacity-50 hidden md:block"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 md:right-2"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div
        className={cn(
          "flex-1 flex flex-col h-[calc(100vh-64px)] main-content",
          "transition-all duration-300 ease-in-out",
          !sidebarOpen ? "w-full" : "hidden md:flex md:w-[calc(100%-16rem)]",
        )}
      >
        <div className="p-4 flex items-center bg-muted/80 border-b">
          {!sidebarOpen && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="mr-2"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
          {!isEmpty && (
            <div className="text-lg font-semibold">
              Video generator agent
            </div>
          )}
          <Avatar className="cursor-pointer ml-auto">
            <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=user" />
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
        </div>

        <div className="flex-1 overflow-hidden">
          {!isEmpty && (
            <div className="relative h-full">
              <ScrollArea
                className="h-full p-4"
                onScroll={handleScroll}
                ref={scrollAreaRef}
              >
                <div className="space-y-4">
                  {messageGroups.map((group, index) => (
                    <MessageGroup key={index} messages={group} />
                  ))}
                </div>
              </ScrollArea>
              {showScrollButton && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 shadow-lg"
                  onClick={scrollToBottom}
                >
                  <ChevronDown className="h-4 w-4" />
                  Scroll to bottom
                </Button>
              )}
            </div>
          )}
        </div>

        <ChatInput />
      </div>

      {/* Fixed Footer */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <Footer />
      </div>
    </div>
  );
}