import React, { useState } from "react";
import { Send, Bot, User, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

interface Message {
  id: string;
  type: "user" | "bot";
  content: string;
  timestamp: Date;
}

const AIAssistant: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // 🔗 Call backend AI API
  const generateResponse = async (userMessage: string): Promise<string> => {
    try {
      const res = await fetch("http://localhost:5000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });

      const data = await res.json();
      return data.reply || "⚠️ Sorry, I couldn’t understand that.";
    } catch (err) {
      console.error("AI API error:", err);
      return "⚠️ Sorry, I'm having trouble responding right now.";
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: inputMessage,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputMessage("");
    setIsTyping(true);

    // ✨ Fetch AI reply
    const aiReply = await generateResponse(newMessage.content);

    const botResponse: Message = {
      id: (Date.now() + 1).toString(),
      type: "bot",
      content: aiReply,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, botResponse]);
    setIsTyping(false);
  };

  const handleQuickQuestion = (question: string) => {
    setInputMessage(question);
    handleSendMessage();
  };

  return (
    <div className="p-4 bg-white shadow-lg rounded-2xl flex flex-col h-[80vh]">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4 border-b pb-2">
        <Bot className="w-6 h-6 text-green-600" />
        <h2 className="text-lg font-semibold">AI Farming Assistant</h2>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto mb-4 space-y-3">
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`flex items-start gap-2 ${
              msg.type === "user" ? "justify-end" : "justify-start"
            }`}
          >
            {msg.type === "bot" && (
              <Bot className="w-5 h-5 mt-1 text-green-600" />
            )}
            <div
              className={`p-3 rounded-2xl max-w-xs ${
                msg.type === "user"
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {msg.content}
            </div>
            {msg.type === "user" && (
              <User className="w-5 h-5 mt-1 text-gray-500" />
            )}
          </motion.div>
        ))}

        {isTyping && (
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Loader2 className="animate-spin w-4 h-4" /> Assistant is typing...
          </div>
        )}
      </div>

      {/* Quick Questions */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {[
          "Best crop for this season?",
          "Should I irrigate today?",
          "Tips for pest control",
          "Fertilizer advice",
        ].map((q) => (
          <button
            key={q}
            onClick={() => handleQuickQuestion(q)}
            className="px-3 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-xl text-sm transition"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
          placeholder="Ask about crops, soil, irrigation..."
          className="flex-1 border rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <button
          onClick={handleSendMessage}
          className="bg-green-600 text-white p-2 rounded-xl hover:bg-green-700 transition"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default AIAssistant;
