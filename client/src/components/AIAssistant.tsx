import React, { useCallback, useEffect, useRef, useState } from "react";
import { Send, Bot, User, Loader2, X, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Message = {
  id: string;
  type: "user" | "bot";
  content: string;
  timestamp: string;
};

const AIAssistantPopup: React.FC<{ serverUrl?: string }> = ({ serverUrl = "/chat" }) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  const generateResponse = async (userMessage: string): Promise<string> => {
    try {
      const res = await fetch(serverUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });
      if (!res.ok) return "⚠️ The server returned an error.";
      const data = await res.json();
      return data.reply ?? data.text ?? "⚠️ Sorry, I couldn't understand that.";
    } catch (err) {
      console.error("AI API error:", err);
      return "⚠️ I'm having trouble reaching the server.";
    }
  };

  const sendMessage = async (text?: string) => {
    const trimmed = (text ?? inputMessage).trim();
    if (!trimmed) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      type: "user",
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
    setIsTyping(true);

    const reply = await generateResponse(trimmed);

    const botMsg: Message = {
      id: `b-${Date.now()}`,
      type: "bot",
      content: reply,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, botMsg]);
    setIsTyping(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isTyping) sendMessage();
    }
  };

  const quickQs = [
    "Best crop for this season?",
    "Should I irrigate today?",
    "Tips for pest control",
    "Fertilizer advice",
  ];

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end">
      {/* Overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gray-800 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Chat window */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="chatbox"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.25 }}
            // ⬇️ raise chatbox a bit to avoid overlap
            className="fixed bottom-20 right-6 w-[25vw] h-[25vh] min-w-[280px] min-h-[320px] max-w-[90vw] max-h-[70vh] bg-white shadow-2xl rounded-xl flex flex-col z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-green-600" />
                <h3 className="text-sm font-semibold">AI Farming Assistant</h3>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close chat"
                className="p-1 rounded-md hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div
              ref={containerRef}
              className="flex-1 overflow-y-auto p-2 space-y-2 bg-gray-50 text-sm"
            >
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-end ${
                    msg.type === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {msg.type === "bot" && (
                    <Bot className="w-4 h-4 mt-1 text-green-600 mr-1" />
                  )}
                  <div
                    className={`rounded-xl px-3 py-2 max-w-[70%] break-words text-xs ${
                      msg.type === "user"
                        ? "bg-green-600 text-white"
                        : "bg-white text-gray-900 shadow"
                    }`}
                  >
                    {msg.content}
                    <div className="text-[9px] opacity-50 mt-1 text-right">
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                  {msg.type === "user" && (
                    <User className="w-4 h-4 mt-1 text-gray-400 ml-1" />
                  )}
                </div>
              ))}

              {isTyping && (
                <div className="flex items-center gap-1 text-gray-500 text-xs">
                  <Loader2 className="animate-spin w-3 h-3" /> Assistant is typing...
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="p-2 border-t">
              <div className="grid grid-cols-2 gap-2 mb-2">
                {quickQs.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    disabled={isTyping}
                    className="px-2 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded-md text-[10px] transition disabled:opacity-60"
                  >
                    {q}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about crops..."
                  rows={1}
                  className="flex-1 resize-none border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={isTyping || !inputMessage.trim()}
                  aria-label="Send message"
                  className="bg-green-600 text-white p-2 rounded-lg hover:bg-green-700 transition disabled:opacity-60"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating toggle button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close chat" : "Open chat"}
        className="w-12 h-12 rounded-full bg-green-600 text-white shadow-lg flex items-center justify-center hover:bg-green-700 z-50"
      >
        {open ? <X className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
      </button>
    </div>
  );
};

export default AIAssistantPopup;
