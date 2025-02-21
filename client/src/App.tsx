import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Chat from "@/pages/chat";
import { ChatProvider } from "@/lib/chat-context";
import { ThemeProvider } from "@/lib/theme-context";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Chat} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ChatProvider>
          <Router />
          <Toaster />
        </ChatProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;