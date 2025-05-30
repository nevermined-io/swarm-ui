import { Switch, Route } from "wouter";
import { useChat } from "@/lib/chat-context";
import type { FullMessage } from "@/lib/chat-context";
import { ScrollArea } from "@/components/ui/scroll-area";
import MessageGroup from "./MessageGroup";
import ChatInput from "./ChatInput";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Sidebar from "./Sidebar";
import { Separator } from "@/components/ui/separator";
import { useState, useEffect, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Settings,
  HelpCircle,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Footer from "./Footer";
import Logo from "./Logo";
import { Badge } from "@/components/ui/badge";
import { useUserCredits } from "@/lib/useUserCredits";

export default function ChatContainer() {
  const { messages, conversations } = useChat();
  const isEmpty = messages.length === 0;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [credits, refreshCredits] = useUserCredits();
  const loading = credits === null;

  // Recarga créditos cuando hay una transacción relevante
  useEffect(() => {
    if (!messages.length) return;
    const last = messages[messages.length - 1];
    if (["nvm-transaction", "answer", "error"].includes(last.type)) {
      refreshCredits();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  const handleFinishTyping = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Set initial sidebar state based on screen width
  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    setSidebarOpen(!isMobile);
  }, []);

  // Group messages by type sequences
  const messageGroups = messages.reduce((groups: FullMessage[][], message) => {
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
          "fixed md:relative z-40"
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
          !sidebarOpen ? "w-full" : "hidden md:flex md:w-[calc(100%-16rem)]"
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
              Music video generator swarm
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Available credit badge */}
            <Badge
              variant="secondary"
              className={
                loading
                  ? "min-w-[60px] justify-center text-gray-400"
                  : credits === 0
                  ? "min-w-[60px] justify-center text-red-500"
                  : "min-w-[60px] justify-center text-green-600"
              }
            >
              {loading ? "..." : `${credits} credits`}
            </Badge>
            {!sidebarOpen && <Logo />}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar className="cursor-pointer border-2 border-primary/10 hover:border-primary/20 transition-colors">
                  <AvatarFallback className="bg-primary/5">
                    <Settings className="h-4 w-4 text-primary/70" />
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="cursor-pointer">
                  <HelpCircle className="mr-2 h-4 w-4" />
                  Help
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex-1 overflow-hidden relative">
          {!isEmpty && (
            <div className="h-full">
              <div className="h-full px-4 overflow-y-auto">
                <div className="space-y-4 pb-12">
                  {messageGroups.map((group, index) => (
                    <MessageGroup
                      key={index}
                      messages={group}
                      isFirstGroup={index === 0}
                      onFinishTyping={handleFinishTyping}
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </div>
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
