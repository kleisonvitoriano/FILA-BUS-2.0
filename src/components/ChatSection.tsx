import React, { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import { Send } from "lucide-react";
import { ChatMessage } from "../types";
import { getThemeHex } from "../utils"; // We can create a simple util or define it
import UserAvatar from "./UserAvatar";

// Simple helper to get colors based on theme settings
const activeThemeHex = "dc2626"; // Fallback red

interface ChatSectionProps {
  messages: ChatMessage[];
  currentUserId: string;
  onSendMessage: (text: string) => Promise<void>;
}

export default function ChatSection({ messages, currentUserId, onSendMessage }: ChatSectionProps) {
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSending) return;
    setIsSending(true);
    try {
      await onSendMessage(inputText.trim());
      setInputText("");
    } catch (e) {
      // Ignored
    } finally {
      setIsSending(false);
    }
  };

  return (
    <motion.section 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative min-h-[360px] flex flex-col justify-between mt-6 p-4 pb-16"
    >
      {/* Visual background wrapper to prevent absolute title clippage */}
      <div 
        className="absolute inset-0 bg-white border-4 border-black shadow-[6px_6px_0px_0px_var(--theme-primary)]"
        style={{
          clipPath: "polygon(0% 2%, 100% 0%, 98% 97%, 3% 100%)",
          zIndex: 0
        }}
      />

      {/* Absolute Header Overlay */}
      <div 
        className="absolute -top-4 right-4 bg-black text-white font-black italic px-4 py-1 text-md border-2 border-theme uppercase select-none"
        style={{
          transform: "rotate(2deg)",
          boxShadow: "3px 3px 0px 0px var(--theme-primary)",
          zIndex: 10
        }}
      >
        CHAT DA FILA
      </div>

      <div className="relative z-10 flex-grow flex flex-col justify-between">
        {/* Messages Window */}
        <div 
          ref={containerRef}
          className="flex-1 mt-4 overflow-y-auto max-h-[220px] space-y-4 pr-1 mb-4 scroll-smooth"
        >
          {messages.length === 0 ? (
            <div className="text-center py-10 font-bold text-gray-500 italic uppercase">
              NENHUMA MENSAGEM ENVIADA
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.userId === currentUserId;
              // Format Timestamp
              let timeStr = "AGORA";
              if (msg.timestamp) {
                const dt = msg.timestamp.toDate ? msg.timestamp.toDate() : new Date(msg.timestamp);
                timeStr = dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
              }

              const senderInitial = msg.sender ? msg.sender.charAt(0).toUpperCase() : "?";

              return (
                <div 
                  key={msg.id} 
                  className={`flex gap-2.5 ${isMe ? "justify-end flex-row-reverse" : "justify-start"}`}
                >
                  {/* Micro avatar */}
                  <div className="shrink-0">
                    <UserAvatar src={msg.photoUrl} name={msg.sender || "U"} size="sm" />
                  </div>

                  <div className={`flex flex-col max-w-[75%] ${isMe ? "items-end" : "items-start"}`}>
                    <div className="flex items-baseline gap-1.5 mb-0.5">
                      <span className="font-black text-xs text-black uppercase tracking-tight">
                        {isMe ? "VOCÊ" : (msg.sender || "PASSAGEIRO").split(" ")[0]}
                      </span>
                      <span className="text-[9px] font-bold text-gray-500 tracking-wide">
                        {timeStr}
                      </span>
                    </div>

                    <div 
                      className="bg-black text-white p-2.5 text-xs font-bold border-l-4 border-theme inline-block text-left"
                      style={{
                        boxShadow: "2px 2px 0px 0px rgba(0,0,0,0.15)",
                        clipPath: isMe 
                          ? "polygon(0 0, 100% 5%, 97% 95%, 0% 100%)" 
                          : "polygon(3% 0, 100% 0, 100% 100%, 0 95%)"
                      }}
                    >
                      <p className="break-words font-black select-text whitespace-pre-wrap">
                        {msg.text}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Input Message Form */}
        <form onSubmit={handleSubmit} className="absolute bottom-3 left-3 right-3 flex gap-2">
          <input 
            type="text" 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="DIGITE UMA MENSAGEM..."
            required
            maxLength={150}
            disabled={isSending}
            className="flex-1 bg-white border-4 border-black text-black font-black uppercase text-xs p-3.5 focus:outline-none focus:border-theme placeholder-gray-400"
            style={{
              boxShadow: "3px 3px 0px 0px #000000"
            }}
          />
          <button 
            type="submit"
            disabled={isSending || !inputText.trim()}
            className="bg-theme hover:bg-black text-white p-3 border-4 border-black shadow-[3px_3px_0_0_#000000] active:scale-95 flex items-center justify-center shrink-0 disabled:opacity-50 transition-colors"
          >
            <Send className="w-5 h-5 transform -rotate-45" />
          </button>
        </form>
      </div>
    </motion.section>
  );
}
