import { useChat } from "@/lib/chat-context";
import { ScrollArea } from "@/components/ui/scroll-area";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Sidebar from "./Sidebar";
import { Separator } from "@/components/ui/separator";

export default function ChatContainer() {
  const { messages, conversations } = useChat();

  return (
    <div className="flex h-screen bg-background">
      <Sidebar conversations={conversations} />
      <Separator orientation="vertical" />
      
      <div className="flex-1 flex flex-col">
        <div className="p-4 flex justify-end items-center border-b">
          <Avatar className="cursor-pointer">
            <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=user" />
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
        </div>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <MessageBubble key={index} message={message} />
            ))}
          </div>
        </ScrollArea>

        <ChatInput />
      </div>
    </div>
  );
}
