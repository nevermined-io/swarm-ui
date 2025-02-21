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
import Logo from "./Logo";

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

  // Handle scroll position check
  const checkScrollPosition = () => {
    const scrollArea = scrollAreaRef.current;
    if (scrollArea) {
      const { scrollTop, scrollHeight, clientHeight } = scrollArea;
      // Show button if we're more than 100px from bottom
      setShowScrollButton(Math.abs(scrollHeight - scrollTop - clientHeight) > 100);
    }
  };

  // Scroll to bottom
  const scrollToBottom = () => {
    const scrollArea = scrollAreaRef.current;
    if (scrollArea) {
      const targetScroll = scrollArea.scrollHeight - scrollArea.clientHeight;
      scrollArea.scrollTo({ top: targetScroll, behavior: 'smooth' });
    }
  };

  // Auto-scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Add scroll event listener
  useEffect(() => {
    const scrollArea = scrollAreaRef.current;
    if (scrollArea) {
      scrollArea.addEventListener('scroll', checkScrollPosition);
      // Initial check
      checkScrollPosition();
    }

    return () => {
      if (scrollArea) {
        scrollArea.removeEventListener('scroll', checkScrollPosition);
      }
    };
  }, []);

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
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <div
        className={cn(
          "transition-all duration-300 ease-in-out h-[calc(100vh-48px)]",
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
              className="absolute top-4 right-4 md:right-2 text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div
        className={cn(
          "flex-1 flex flex-col h-[calc(100vh-48px)] main-content",
          "transition-all duration-300 ease-in-out",
          !sidebarOpen ? "w-full" : "hidden md:flex md:w-[calc(100%-16rem)]",
        )}
      >
        <div className="p-4 flex items-center justify-between bg-muted/80 border-b">
          <div className="flex items-center gap-4">
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
            <div className="text-lg font-semibold">
              Video generator agent
            </div>
          </div>
          <div className="flex items-center gap-4">
            {!sidebarOpen && <Logo />}
            <Avatar className="cursor-pointer">
              <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=user" />
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
          </div>
        </div>

        <div className="flex-1 overflow-hidden relative">
          {!isEmpty && (
            <div className="h-full">
              <div 
                ref={scrollAreaRef}
                className="h-full px-4 overflow-y-auto"
              >
                <div className="space-y-4">
                  {messageGroups.map((group, index) => (
                    <MessageGroup 
                      key={index} 
                      messages={group} 
                      isFirstGroup={index === 0}
                    />
                  ))}
                </div>
              </div>
              {showScrollButton && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="fixed bottom-20 left-1/2 -translate-x-1/2 flex items-center gap-2 shadow-lg z-[100] bg-background/95 backdrop-blur-sm"
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

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <Footer />
      </div>
    </div>
  );
}