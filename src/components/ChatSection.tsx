import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Send, Smile, Trash2, Upload, Link, Grid } from "lucide-react";
import { ChatMessage } from "../types";
import UserAvatar from "./UserAvatar";

// Rich set of relatable, hilarious WhatsApp/TikTok-style animated transparent stickers
export const CHAT_STICKERS = [
  { id: "bus_run", url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3ZtMTM3djNnYXR3NXF2OHF2NXBya2dzbXoxcTBscTRoYTY0eHNkMCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/MDm7hS9S6S6Csc07Sq/giphy.gif", label: "🚌 Acelera!" },
  { id: "cat_sleep", url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbDVqbm01MTBxczM3Znlxb3E3ZXp6bHNzYnMwa3EzbmsxenJtYnVvMSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/33OrjzUFwkwEg/giphy.gif", label: "😴 Dormi" },
  { id: "cat_shock", url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExajRybmwwaXBiaDY2bzRlczB1MWsybWxveG1obXU4ZDNnc2Fsbnd4dyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/13CoXDiaCcC9R6/giphy.gif", label: "🙀 Trânsito" },
  { id: "coffee", url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExc29pdjNoMHdrZDgwdnRwNmxyd3Q4bndzNGlzNTMxYWp0NGh4bmJ2MCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/bW5nNJgKUqW80hjntK/giphy.gif", label: "☕ Café" },
  { id: "happy", url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYnFkNzBydzN0MXdxeXBtYWEzcTBrcmxidGpsNHg5czNvdTI3NmNvbCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/12paXTH09hye76/giphy.gif", label: "🎉 Cheguei!" },
  { id: "angry", url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYzRwNmEwa3NpeXpld2Uwd2I0ZWh3ZmpvZTA2ajN5ZHk5dWRicXBtYiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/BlVnrx6C2z7wI/giphy.gif", label: "😠 Fúria" },
  { id: "shock", url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExaG13Mms0dWtvenhxdXNidmszdHpwMmNpZHRnaWtybWpnbWhqODZ1NSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/3kzJiytJLgxYI/giphy.gif", label: "😮 Quê?!" },
  { id: "money", url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExY3NjcGhpZzdob2w1NHp2ejJid3Y4eGgycXc5cndrYTY1NGQ3MnY3ayZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/l0HFkA6e4DUvPV2Te/giphy.gif", label: "💸 Paguei" },
  { id: "pepe_cry", url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMTA4ZHNiaXV4ajRndGR4c3YxZWh0M3Z6MGpxczM1YW1xOWsyYXB0ZSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/v8qFpRl9vYAilHBYvK/giphy.gif", label: "😢 Fila longa" },
  { id: "spg_run", url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbDV4djZ6NWt3OTl4Zm1nOGc1aGRld2JrcnJkOHR6MHVyNHU5b3E0bCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/3ofSBGFFvXv8HmW2t2/giphy.gif", label: "🏃‍♂️ To indo" },
  { id: "thumb_up", url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbWFmZHJsd3E0dW0yOTF3bzg3N3dwNXBhY2ZkbWFscHZnaTZ0a2x4NCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/l3q2tzon8OCC7BqmY/giphy.gif", label: "👍 Confirmado" },
  { id: "minion_lets", url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdTB1NTV0NzJ3cnVxd2s3MGtsamRsZGVkaG50enIxaWlpZW1iMXRxaiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/MOWPkhRAUbR7i/giphy.gif", label: "🚀 Bora!" }
];

interface ChatSectionProps {
  messages: ChatMessage[];
  currentUserId: string;
  onSendMessage: (text: string) => Promise<void>;
  isAdmin?: boolean;
  onClearChat?: () => Promise<void>;
}

export default function ChatSection({ 
  messages, 
  currentUserId, 
  onSendMessage,
  isAdmin = false,
  onClearChat
}: ChatSectionProps) {
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const [stickerTab, setStickerTab] = useState<"presets" | "upload" | "url">("presets");
  const [stickerUrlInput, setStickerUrlInput] = useState("");
  const [selectedFileBase64, setSelectedFileBase64] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  // Reset selected sticker preview and errors when closing or switching sticker tabs
  useEffect(() => {
    setSelectedFileBase64(null);
    setUploadError(null);
  }, [stickerTab, showStickers]);

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

  const handleSendSticker = async (stickerPayload: string) => {
    if (isSending) return;
    setIsSending(true);
    try {
      await onSendMessage(`[STICKER] ${stickerPayload}`);
      setShowStickers(false);
    } catch (e) {
      // Ignored
    } finally {
      setIsSending(false);
    }
  };

  const handleSendUploadedSticker = async () => {
    if (!selectedFileBase64 || isSending) return;
    setIsSending(true);
    setUploadError(null);
    try {
      await onSendMessage(`[STICKER] ${selectedFileBase64}`);
      setSelectedFileBase64(null);
      setShowStickers(false);
    } catch (e) {
      setUploadError("Erro ao enviar figurinha. Tente novamente.");
    } finally {
      setIsSending(false);
    }
  };

  const handleSendCustomUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stickerUrlInput.trim() || isSending) return;
    await handleSendSticker(stickerUrlInput.trim());
    setStickerUrlInput("");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);

    // Standard client side validation to avoid clogging Firestore (keeps string sizes lean)
    if (file.size > 800 * 1024) {
      setUploadError("IMAGEM MUITO GRANDE! ESCOLHA UM LOGO/GIF DE ATÉ 800KB.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setSelectedFileBase64(base64);
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.onerror = () => {
      setUploadError("ERRO AO CARREGAR O ARQUIVO SELECIONADO.");
    };
    reader.readAsDataURL(file);
  };

  return (
    <motion.section 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative h-[540px] flex flex-col mt-4 p-4 pb-4 select-none"
    >
      {/* Visual background wrapper - Sharp brutalist block with heavy outline, NO content-clipping edges */}
      <div 
        className="absolute inset-0 bg-white border-4 border-black shadow-[6px_6px_0px_0px_var(--theme-primary)]"
        style={{
          zIndex: 0
        }}
      />

      {/* Retro Header Badge */}
      <div 
        className="absolute -top-4 right-4 bg-black text-white font-black italic px-4 py-1 text-md border-2 border-theme uppercase select-none"
        style={{
          transform: "rotate(1.5deg)",
          boxShadow: "3px 3px 0px 0px var(--theme-primary)",
          zIndex: 10
        }}
      >
        CHAT DA FILA
      </div>

      {/* Clean Chat Button for Superadmins only */}
      {isAdmin && onClearChat && (
        <button 
          type="button"
          onClick={onClearChat}
          className="absolute -top-4 left-4 bg-red-600 text-white hover:bg-black font-black italic px-3 py-1 text-xs border-2 border-black uppercase select-none flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-[3px_3px_0px_0px_#000000]"
          style={{
            transform: "rotate(-1deg)",
            zIndex: 10
          }}
        >
          <Trash2 className="w-3 h-3" />
          <span>Limpar Chat</span>
        </button>
      )}

      {/* Main Container Layer */}
      <div className="relative z-10 flex-grow flex flex-col h-full overflow-hidden pt-4 px-1">
        
        {/* Messages Window (Scrollable area) */}
        <div 
          ref={containerRef}
          className="flex-1 overflow-y-auto space-y-4 pr-1 mb-3 scroll-smooth min-h-0"
        >
          {messages.length === 0 ? (
            <div className="text-center py-16 font-black text-gray-400 italic uppercase select-none">
              NENHUMA MENSAGEM ENVIADA
            </div>
          ) : (
            messages.map((msg) => {
              // Check if System Message
              if (msg.type === "system") {
                return (
                  <div key={msg.id} className="flex justify-center my-2 select-none">
                    <div className="bg-amber-100 border-2 border-black text-black px-4 py-2 font-black italic uppercase text-[10px] tracking-wider max-w-[95%] text-center shadow-[3px_3px_0px_0px_#000000]">
                      📢 {msg.text}
                    </div>
                  </div>
                );
              }

              const isMe = msg.userId === currentUserId;
              
              // Format Timestamp
              let timeStr = "AGORA";
              if (msg.timestamp) {
                const dt = msg.timestamp.toDate ? msg.timestamp.toDate() : new Date(msg.timestamp);
                timeStr = dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
              }

              // Evaluate Sticker Messages
              const isSticker = msg.text?.startsWith("[STICKER] ");
              const stickerPayload = isSticker ? msg.text.replace("[STICKER] ", "").trim() : null;

              // Resolve Sticker Asset URL
              let stickerUrl = "";
              if (stickerPayload) {
                if (stickerPayload.startsWith("http") || stickerPayload.startsWith("data:image")) {
                  stickerUrl = stickerPayload;
                } else {
                  stickerUrl = CHAT_STICKERS.find(s => s.id === stickerPayload)?.url || "";
                }
              }

              return (
                <div 
                  key={msg.id} 
                  className={`flex gap-3 ${isMe ? "justify-end flex-row-reverse" : "justify-start"}`}
                >
                  {/* Avatar bubble */}
                  <div className="shrink-0">
                    <UserAvatar src={msg.photoUrl} name={msg.sender || "U"} size="sm" />
                  </div>

                  <div className={`flex flex-col max-w-[70%] ${isMe ? "items-end" : "items-start"}`}>
                    {/* Header: Sender Info & Time stamp */}
                    <div className="flex items-baseline gap-1.5 mb-1.5">
                      <span className="font-black text-[10px] text-black uppercase tracking-tight">
                        {isMe ? "VOCÊ" : (msg.sender || "PASSAGEIRO").split(" ")[0]}
                      </span>
                      <span className="text-[9px] font-bold text-gray-500 tracking-wide">
                        {timeStr}
                      </span>
                    </div>

                    {stickerPayload && stickerUrl ? (
                      /* Background-free WhatsApp style transparent animated/static sticker! */
                      <motion.div 
                        whileHover={{ scale: 1.1, rotate: isMe ? 2 : -2 }}
                        whileTap={{ scale: 0.95 }}
                        className="relative p-1 max-w-[130px] drop-shadow-[3px_3px_2px_rgba(0,0,0,0.35)] select-none cursor-pointer"
                        style={{
                          transform: `rotate(${isMe ? '-1.5deg' : '1.5deg'})`
                        }}
                      >
                        <img 
                          src={stickerUrl} 
                          alt="Figurinha" 
                          referrerPolicy="no-referrer"
                          className="w-full h-auto object-contain max-h-[130px] rounded-md border border-neutral-100"
                        />
                      </motion.div>
                    ) : (
                      /* Clean retro speech bubble - Solid rectangular box with sharp borders and shadows. NO cut-off text! */
                      <div 
                        className={`p-3 text-[13px] font-black border-4 border-black select-text text-left relative ${
                          isMe ? "bg-black text-white" : "bg-neutral-100 text-black"
                        }`}
                        style={{
                          boxShadow: "3px 3px 0px 0px #000000",
                        }}
                      >
                        <p className="break-words select-text whitespace-pre-wrap leading-relaxed tracking-wide">
                          {msg.text}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Dynamic WhatsApp-style Sticker Drawer */}
        <AnimatePresence>
          {showStickers && (
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="bg-neutral-100 border-4 border-black p-3 mb-3 shrink-0"
              style={{
                boxShadow: "4px 4px 0px 0px #000000"
              }}
            >
              {/* Sticker Drawer Tab Bar */}
              <div className="flex gap-1.5 border-b-2 border-black pb-2 mb-2">
                <button
                  type="button"
                  onClick={() => setStickerTab("presets")}
                  className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-[9px] font-black uppercase italic border-2 border-black transition-all cursor-pointer ${
                    stickerTab === "presets" ? "bg-theme text-white shadow-[2px_2px_0px_#000000]" : "bg-white text-black hover:bg-gray-50"
                  }`}
                >
                  <Grid className="w-3.5 h-3.5" />
                  <span>PRESETS</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStickerTab("upload")}
                  className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-[9px] font-black uppercase italic border-2 border-black transition-all cursor-pointer ${
                    stickerTab === "upload" ? "bg-theme text-white shadow-[2px_2px_0px_#000000]" : "bg-white text-black hover:bg-gray-50"
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>UPLOAD</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStickerTab("url")}
                  className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-[9px] font-black uppercase italic border-2 border-black transition-all cursor-pointer ${
                    stickerTab === "url" ? "bg-theme text-white shadow-[2px_2px_0px_#000000]" : "bg-white text-black hover:bg-gray-50"
                  }`}
                >
                  <Link className="w-3.5 h-3.5" />
                  <span>URL LINK</span>
                </button>
              </div>

              {/* Presets Grid Panel */}
              {stickerTab === "presets" && (
                <div className="grid grid-cols-4 gap-2 max-h-[140px] overflow-y-auto pr-1">
                  {CHAT_STICKERS.map((stk) => (
                    <button
                      key={stk.id}
                      type="button"
                      onClick={() => handleSendSticker(stk.id)}
                      disabled={isSending}
                      className="bg-white hover:bg-amber-100 border-2 border-black p-1.5 flex flex-col items-center justify-center gap-1 active:scale-95 cursor-pointer relative group"
                    >
                      <img 
                        src={stk.url} 
                        alt={stk.label} 
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 object-contain select-none pointer-events-none rounded"
                      />
                      <span className="text-[8px] font-black text-black uppercase tracking-tight select-none truncate w-full pt-0.5 line-clamp-1 border-t border-dashed border-gray-200">
                        {stk.label}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Upload Sticker Form */}
              {stickerTab === "upload" && (
                <div className="flex flex-col items-center py-2 text-center">
                  {!selectedFileBase64 ? (
                    <>
                      <p className="text-[10px] font-black text-black uppercase mb-1">
                        Faça upload de qualquer imagem ou GIF para criar sua figurinha:
                      </p>
                      <input 
                        type="file" 
                        accept="image/*"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isSending}
                        className="bg-black text-white hover:bg-theme hover:text-black font-black uppercase italic text-xs py-2 px-4 border-2 border-black active:scale-95 shadow-[3px_3px_0px_var(--theme-primary)] transition-all cursor-pointer"
                      >
                        Selecionar Imagem / GIF
                      </button>
                      <span className="text-[8px] font-bold text-gray-500 uppercase mt-1.5 tracking-wide">
                        Tamanho recomendado: Max 800KB
                      </span>
                      {uploadError && (
                        <div className="mt-2 text-[9px] font-black uppercase text-red-600 bg-red-100 border-2 border-red-600 px-2.5 py-1 select-all">
                          ⚠️ {uploadError}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-[10px] font-black text-theme uppercase animate-pulse">
                        Sua figurinha está pronta! Enviar?
                      </p>
                      
                      {/* Live Image/GIF Preview Frame */}
                      <div className="border-4 border-black p-1 bg-white shadow-[3px_3px_0_0_#000000] h-[90px] w-[90px] overflow-hidden flex items-center justify-center">
                        <img 
                          src={selectedFileBase64} 
                          alt="Prévia da Figurinha" 
                          className="max-h-[80px] max-w-[80px] object-contain rounded"
                        />
                      </div>

                      <div className="flex gap-2 mt-1">
                        <button
                          type="button"
                          onClick={handleSendUploadedSticker}
                          disabled={isSending}
                          className="bg-emerald-500 text-white hover:bg-black font-black uppercase text-[10px] px-3 py-1.5 border-2 border-black shadow-[2px_2px_0_0_#000000] active:scale-95 transition-all cursor-pointer"
                        >
                          {isSending ? "Enviando..." : "Confirmar e Enviar"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedFileBase64(null)}
                          disabled={isSending}
                          className="bg-red-500 text-white hover:bg-black font-black uppercase text-[10px] px-3 py-1.5 border-2 border-black shadow-[2px_2px_0_0_#000000] active:scale-95 transition-all cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                      {uploadError && (
                        <div className="mt-1 text-[9px] font-black uppercase text-red-600 bg-red-100 border-2 border-red-600 px-2 py-0.5">
                          ⚠️ {uploadError}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Custom Web URL Form */}
              {stickerTab === "url" && (
                <form onSubmit={handleSendCustomUrl} className="flex gap-1.5 py-1">
                  <input 
                    type="url" 
                    value={stickerUrlInput}
                    onChange={(e) => setStickerUrlInput(e.target.value)}
                    placeholder="Cole o link da imagem/GIF aqui..."
                    required
                    disabled={isSending}
                    className="flex-1 bg-white border-2 border-black text-black font-semibold text-[11px] p-2 focus:outline-none focus:border-theme placeholder-gray-400"
                  />
                  <button 
                    type="submit"
                    disabled={isSending || !stickerUrlInput.trim()}
                    className="bg-black hover:bg-theme text-white hover:text-black font-black text-[10px] px-3 border-2 border-black uppercase transition-all shadow-[2px_2px_0px_#000000] cursor-pointer"
                  >
                    Enviar
                  </button>
                </form>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Message Form  */}
        <form onSubmit={handleSubmit} className="flex gap-2 relative z-10 shrink-0 mt-auto">
          <button
            type="button"
            onClick={() => setShowStickers(!showStickers)}
            className={`p-3 border-4 border-black flex items-center justify-center shrink-0 active:scale-95 transition-all shadow-[3px_3px_0_0_#000000] cursor-pointer ${
              showStickers ? "bg-black text-theme" : "bg-white text-black hover:bg-gray-100"
            }`}
          >
            <Smile className="w-5 h-5" />
          </button>
          
          <input 
            type="text" 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="DIGITE UMA MENSAGEM..."
            required
            maxLength={150}
            disabled={isSending}
            className="flex-1 bg-white border-4 border-black text-black font-black uppercase text-xs p-3 focus:outline-none focus:border-theme placeholder-gray-400 min-w-0"
            style={{
              boxShadow: "3px 3px 0px 0px #000000"
            }}
          />
          
          <button 
            type="submit"
            disabled={isSending || !inputText.trim()}
            className="bg-theme hover:bg-black text-white p-3 border-4 border-black shadow-[3px_3px_0_0_#000000] active:scale-95 flex items-center justify-center shrink-0 disabled:opacity-50 transition-colors cursor-pointer"
          >
            <Send className="w-5 h-5 transform -rotate-45" />
          </button>
        </form>

      </div>
    </motion.section>
  );
}
