"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Bot,
  User,
  Sparkles,
  Loader2,
  Lightbulb,
  Cpu,
  Package,
  AlertTriangle,
  Users,
  ArrowLeft,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import { ChatMessage } from "@/lib/types";
import { cn, formatRelativeTime } from "@/lib/utils";
import { useRouter } from "next/navigation";

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

export default function KioskChatPage() {
  const router = useRouter();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      user_id: "anonymous_kiosk",
      role: "user",
      content: input,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: input,
          conversation_id: conversationId || undefined,
          kiosk_mode: true,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const data = await response.json();

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        user_id: "anonymous_kiosk",
        role: "assistant",
        content: data.message,
        conversation_id: data.conversation_id,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setConversationId(data.conversation_id);
    } catch (error: any) {
      toast({
        title: "Failed to send message",
        description: error.message,
        variant: "destructive",
      });
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSuggestedQuery = async (query: string) => {
    setInput(query);
    setTimeout(() => {
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        user_id: "anonymous_kiosk",
        role: "user",
        content: query,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setIsLoading(true);

      fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: query,
          conversation_id: conversationId || undefined,
          kiosk_mode: true,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          const assistantMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            user_id: "anonymous_kiosk",
            role: "assistant",
            content: data.message,
            conversation_id: data.conversation_id,
            created_at: new Date().toISOString(),
          };

          setMessages((prev) => [...prev, assistantMessage]);
          setConversationId(data.conversation_id);
          setIsLoading(false);
          inputRef.current?.focus();
        })
        .catch((error) => {
          toast({
            title: "Failed to send message",
            description: error.message,
            variant: "destructive",
          });
          setMessages((prev) => prev.slice(0, -1));
          setIsLoading(false);
        });
    }, 100);
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="border-b border-slate-700 bg-slate-800/50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-white">LogGPT</h1>
              <p className="text-xs text-slate-400">AI-powered inventory assistant</p>
            </div>
          </motion.div>

          <Button
            onClick={() => router.push("/kiosk")}
            variant="ghost"
            className="text-slate-400 hover:text-white hover:bg-slate-700"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Kiosk
          </Button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center px-4 pb-8">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center mb-12"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bot className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Welcome to LogGPT</h2>
              <p className="text-slate-400 mb-8">
                I'm your AI-powered inventory assistant. Ask me about components, check availability, find out who has what, and more.
              </p>
            </motion.div>

            {/* Suggested Queries */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
              <AnimatePresence>
                {suggestedQueries.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <button
                        onClick={() => handleSuggestedQuery(item.query)}
                        className="w-full text-left p-4 rounded-lg border border-slate-700 bg-slate-800/50 hover:bg-slate-700 hover:border-slate-600 transition-all group"
                      >
                        <div className={`flex items-center gap-3 ${item.color}`}>
                          <Icon className="w-5 h-5" />
                          <div>
                            <p className="font-medium text-white text-sm">{item.title}</p>
                            <p className="text-xs text-slate-400">{item.query}</p>
                          </div>
                        </div>
                      </button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        ) : (
          <ScrollArea className="flex-1 px-4">
            <div className="space-y-4 py-6">
              <AnimatePresence>
                {messages.map((message, index) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className={cn("flex gap-3", message.role === "user" && "justify-end")}
                  >
                    {message.role === "assistant" && (
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                          <Bot className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    )}

                    <div
                      className={cn(
                        "max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-lg",
                        message.role === "assistant"
                          ? "bg-slate-700 text-slate-100"
                          : "bg-purple-600 text-white"
                      )}
                    >
                      <p className="text-sm">{message.content}</p>
                    </div>

                    {message.role === "user" && (
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3"
                >
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                      <Loader2 className="w-4 h-4 text-white animate-spin" />
                    </div>
                  </div>
                  <div className="max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-lg bg-slate-700">
                    <div className="flex gap-2">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ delay: "0.1s" }} />
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ delay: "0.2s" }} />
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        )}

        {/* Input Area */}
        <div className="border-t border-slate-700 bg-slate-800/50 backdrop-blur-sm px-4 py-4">
          <div className="max-w-2xl mx-auto flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask about components, availability, or who has what..."
              disabled={isLoading}
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:border-purple-500"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
