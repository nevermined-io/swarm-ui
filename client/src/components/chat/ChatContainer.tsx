import { useChat } from "@/lib/chat-context";
import { ScrollArea } from "@/components/ui/scroll-area";
import MessageGroup from "./MessageGroup";
import ChatInput from "./ChatInput";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Sidebar from "./Sidebar";
import { Separator } from "@/components/ui/separator";

interface Message {
  type: string;
  isUser: boolean;
  // ... other message properties
}


export default function ChatContainer() {
  const { messages, conversations } = useChat();
  const isEmpty = messages.length === 0;

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
      <Sidebar conversations={conversations} />
      <Separator orientation="vertical" className="opacity-50" />

      <div className="flex-1 flex flex-col bg-muted/80">
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