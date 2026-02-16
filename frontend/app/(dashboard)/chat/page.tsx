"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Bot,
  User,
  Sparkles,
  Loader2,
  MessageSquare,
  Plus,
  Trash2,
  History,
  Lightbulb,
  Cpu,
  Package,
  AlertTriangle,
  Users,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import { useAuthStore } from "@/lib/store";
import { chatApi } from "@/lib/api";
import { ChatMessage } from "@/lib/types";
import { cn, formatRelativeTime } from "@/lib/utils";

const suggestedQueries = [
  {
    icon: Package,
    title: "Available Components",
    query: "What components are currently available?",
    color: "text-blue-500 bg-blue-500/10",
  },
  {
    icon: Users,
    title: "Who has ESP32?",
    query: "Who currently has the ESP32 checked out?",
    color: "text-purple-500 bg-purple-500/10",
  },
  {
    icon: AlertTriangle,
    title: "Overdue Items",
    query: "Which components are overdue?",
    color: "text-red-500 bg-red-500/10",
  },
  {
    icon: Cpu,
    title: "Popular Components",
    query: "What are the most requested components?",
    color: "text-green-500 bg-green-500/10",
  },
];

export default function ChatPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<
    { id: string; title: string; created_at: string }[]
  >([]);
  const [showHistory, setShowHistory] = useState(false);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const data = await chatApi.getHistory();
      // Group messages by conversation
      const convMap = new Map<
        string,
        { id: string; title: string; created_at: string }
      >();
      data.messages.forEach((msg: ChatMessage) => {
        if (msg.conversation_id && !convMap.has(msg.conversation_id)) {
          convMap.set(msg.conversation_id, {
            id: msg.conversation_id,
            title:
              msg.role === "user"
                ? msg.content.slice(0, 50) + (msg.content.length > 50 ? "..." : "")
                : "Conversation",
            created_at: msg.created_at,
          });
        }
      });
      setConversations(Array.from(convMap.values()));
    } catch (error) {
      console.error("Failed to fetch chat history:", error);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      user_id: user?.id || "",
      role: "user",
      content: input,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await chatApi.send(input, conversationId || undefined);

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        user_id: user?.id || "",
        role: "assistant",
        content: response.message,
        conversation_id: response.conversation_id,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setConversationId(response.conversation_id);
    } catch (error: any) {
      toast({
        title: "Failed to send message",
        description: error.message,
        variant: "destructive",
      });
      // Remove the user message on error
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSuggestedQuery = (query: string) => {
    setInput(query);
    inputRef.current?.focus();
  };

  const startNewConversation = () => {
    setMessages([]);
    setConversationId(null);
    setShowHistory(false);
  };

  const loadConversation = async (convId: string) => {
    try {
      const data = await chatApi.getHistory();
      const convMessages = data.messages.filter(
        (msg: ChatMessage) => msg.conversation_id === convId
      );
      setMessages(convMessages);
      setConversationId(convId);
      setShowHistory(false);
    } catch (error) {
      console.error("Failed to load conversation:", error);
    }
  };

  const clearHistory = async () => {
    try {
      await chatApi.clearHistory();
      setMessages([]);
      setConversationId(null);
      setConversations([]);
      toast({
        title: "History cleared",
        description: "All chat history has been deleted.",
      });
    } catch (error: any) {
      toast({
        title: "Failed to clear history",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Sidebar - History */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <Card className="h-full">
              <div className="flex items-center justify-between border-b p-4">
                <h3 className="font-semibold">Chat History</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clearHistory}
                  className="h-8 w-8 text-muted-foreground hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <ScrollArea className="h-[calc(100%-60px)]">
                <div className="space-y-2 p-2">
                  {conversations.length === 0 ? (
                    <p className="p-4 text-center text-sm text-muted-foreground">
                      No chat history yet
                    </p>
                  ) : (
                    conversations.map((conv) => (
                      <button
                        key={conv.id}
                        onClick={() => loadConversation(conv.id)}
                        className={cn(
                          "w-full rounded-lg p-3 text-left transition-colors hover:bg-muted",
                          conversationId === conv.id && "bg-muted"
                        )}
                      >
                        <p className="truncate text-sm font-medium">
                          {conv.title}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatRelativeTime(conv.created_at)}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">LogGPT</h1>
              <p className="text-sm text-muted-foreground">
                AI-powered inventory assistant
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
            >
              <History className="mr-2 h-4 w-4" />
              History
            </Button>
            <Button size="sm" onClick={startNewConversation}>
              <Plus className="mr-2 h-4 w-4" />
              New Chat
            </Button>
          </div>
        </div>

        {/* Messages Area */}
        <Card className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="space-y-4 p-4">
              {messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center py-12">
                  <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500">
                    <Bot className="h-10 w-10 text-white" />
                  </div>
                  <h2 className="mb-2 text-2xl font-bold">
                    Welcome to LogGPT
                  </h2>
                  <p className="mb-8 max-w-md text-center text-muted-foreground">
                    I'm your AI-powered inventory assistant. Ask me about
                    components, check availability, find out who has what, and
                    more.
                  </p>

                  {/* Suggested Queries */}
                  <div className="grid w-full max-w-2xl gap-3 sm:grid-cols-2">
                    {suggestedQueries.map((suggestion) => (
                      <button
                        key={suggestion.title}
                        onClick={() => handleSuggestedQuery(suggestion.query)}
                        className="group flex items-start gap-3 rounded-lg border p-4 text-left transition-all hover:border-primary hover:bg-muted"
                      >
                        <div
                          className={cn(
                            "rounded-lg p-2",
                            suggestion.color
                          )}
                        >
                          <suggestion.icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium group-hover:text-primary">
                            {suggestion.title}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {suggestion.query}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((message, index) => (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      isLast={index === messages.length - 1}
                    />
                  ))}
                  {isLoading && (
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                      <div className="rounded-lg bg-muted px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm text-muted-foreground">
                            Thinking...
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>
          </ScrollArea>
        </Card>

        {/* Input Area */}
        <div className="mt-4">
          <div className="relative">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask about components, availability, or who has what..."
              className="pr-12"
              disabled={isLoading}
            />
            <Button
              size="icon"
              className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            LogGPT can make mistakes. Please verify important information.
          </p>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  isLast,
}: {
  message: ChatMessage;
  isLast: boolean;
}) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={isLast ? { opacity: 0, y: 10 } : false}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex items-start gap-3", isUser && "flex-row-reverse")}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-gradient-to-br from-purple-500 to-pink-500"
        )}
      >
        {isUser ? (
          <User className="h-4 w-4" />
        ) : (
          <Bot className="h-4 w-4 text-white" />
        )}
      </div>
      <div
        className={cn(
          "max-w-[80%] rounded-lg px-4 py-3",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted"
        )}
      >
        <div className="prose prose-sm dark:prose-invert max-w-none">
          {(message.content || "").split("\n").map((line, i) => (
            <p key={i} className={cn("mb-1 last:mb-0", !isUser && "text-foreground")}>
              {line || "\u00A0"}
            </p>
          ))}
        </div>
        <p
          className={cn(
            "mt-2 text-xs",
            isUser ? "text-primary-foreground/70" : "text-muted-foreground"
          )}
        >
          {formatRelativeTime(message.created_at)}
        </p>
      </div>
    </motion.div>
  );
}
