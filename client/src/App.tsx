import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Chat from "@/pages/chat";
import { ChatProvider } from "@/lib/chat-context";
import { ThemeProvider } from "@/lib/theme-context";
import { UserStateProvider } from "@/lib/user-state-context";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Chat} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <UserStateProvider>
        <ChatProvider>
          <ThemeProvider>
            <Router />
            <Toaster />
          </ThemeProvider>
        </ChatProvider>
      </UserStateProvider>
    </QueryClientProvider>
  );
}
