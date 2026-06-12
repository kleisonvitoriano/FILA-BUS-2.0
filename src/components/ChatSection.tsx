import React, { useState, useRef, useEffect } from "react";
import { Send, Trash2, Sticker, Search, Loader2 } from "lucide-react";
import { ChatMessage } from "../types";
import UserAvatar from "./UserAvatar";

interface ChatSectionProps {
  messages: ChatMessage[];
  currentUserId: string;
  onSendMessage: (text: string, imageUrl?: string) => Promise<void>;
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
  const [showMemes, setShowMemes] = useState(false);
  const [memeSearchQuery, setMemeSearchQuery] = useState("");
  const [memeResults, setMemeResults] = useState<{id: string, url: string}[]>([]);
  const [isSearchingMemes, setIsSearchingMemes] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!showMemes) return;
    const fetchGifs = async () => {
      setIsSearchingMemes(true);
      try {
        const query = memeSearchQuery.trim() || 'meme brasil';
        const apiKey = import.meta.env.VITE_GIPHY_API_KEY || 's5D3Ej9mIGp8jgR9vUh8HL5fraSrecoB'; // User provided key
        const response = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(query)}&limit=16&rating=pg`);
        
        if (!response.ok) throw new Error("Giphy API error");
        
        const data = await response.json();
        if (data && data.data && data.data.length > 0) {
          setMemeResults(data.data.map((gif: any) => ({
            id: gif.id,
            url: gif.images?.fixed_width?.url || gif.images?.original?.url
          })));
        } else {
          // Fallback se não encontrar nada ou erro da API
          setMemeResults([
            { id: "nazare", url: "https://i.imgflip.com/1q0k32.jpg" },
            { id: "rindo", url: "https://media.tenor.com/b_80qUeB8Q8AAAAC/rindo-muito-rindo.gif" },
            { id: "chocada", url: "https://media.tenor.com/cO-bQh8T2aQAAAAC/chocada-gasp.gif" },
            { id: "deboche", url: "https://media.tenor.com/y3y_2LdKxT4AAAAC/deboche-meme.gif" },
            { id: "gretchen", url: "https://media.tenor.com/2s_t9mN7d1QAAAAC/gretchen-conga.gif" },
            { id: "triste", url: "https://media.tenor.com/4N-c0M7l1F0AAAAC/crying-crying-meme.gif" },
            { id: "chapolin", url: "https://media.tenor.com/B94mR7_0Z7oAAAAC/chapolin-colorado.gif" },
            { id: "chico", url: "https://i.imgflip.com/7161.jpg" }
          ]);
        }
      } catch (err) {
        console.error("Giphy search failed:", err);
        setMemeResults([
          { id: "nazare", url: "https://i.imgflip.com/1q0k32.jpg" },
          { id: "rindo", url: "https://media.tenor.com/b_80qUeB8Q8AAAAC/rindo-muito-rindo.gif" },
          { id: "chocada", url: "https://media.tenor.com/cO-bQh8T2aQAAAAC/chocada-gasp.gif" },
          { id: "deboche", url: "https://media.tenor.com/y3y_2LdKxT4AAAAC/deboche-meme.gif" },
          { id: "gretchen", url: "https://media.tenor.com/2s_t9mN7d1QAAAAC/gretchen-conga.gif" },
          { id: "triste", url: "https://media.tenor.com/4N-c0M7l1F0AAAAC/crying-crying-meme.gif" },
          { id: "chapolin", url: "https://media.tenor.com/B94mR7_0Z7oAAAAC/chapolin-colorado.gif" },
          { id: "chico", url: "https://i.imgflip.com/7161.jpg" }
        ]);
      } finally {
        setIsSearchingMemes(false);
      }
    };

    const timeoutId = setTimeout(fetchGifs, 500);
    return () => clearTimeout(timeoutId);
  }, [memeSearchQuery, showMemes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSending) return;
    setIsSending(true);
    setShowMemes(false);
    try {
      await onSendMessage(inputText.trim());
      setInputText("");
    } catch (e) {
      // Ignore
    } finally {
      setIsSending(false);
    }
  };

  const handleSendMeme = async (url: string) => {
    if (isSending) return;
    setIsSending(true);
    setShowMemes(false);
    try {
      await onSendMessage("", url);
    } catch (e) {
      // Ignore
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="bg-white border-4 border-black p-4 mt-6 mb-8 relative max-w-4xl mx-auto" style={{ boxShadow: "8px 8px 0px 0px var(--theme-primary)" }}>
      <div className="flex justify-between items-center bg-black text-white px-4 py-3 mb-4 -mx-4 -mt-4 border-b-4 border-black">
        <h3 className="font-black italic uppercase tracking-wider text-xl text-yellow-500">CHAT DA FILA</h3>
        {isAdmin && onClearChat && (
          <button 
            type="button"
            onClick={onClearChat}
            className="flex items-center gap-2 bg-red-600 hover:bg-white hover:text-black text-white px-3 py-1 font-bold italic text-xs border-2 border-black transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>LIMPAR</span>
          </button>
        )}
      </div>

      <div 
        ref={containerRef}
        className="h-[350px] overflow-y-auto space-y-4 pr-2 mb-4 scroll-smooth"
      >
        {messages.length === 0 ? (
          <div className="text-center py-20 text-gray-400 font-bold italic uppercase tracking-widest">
            Sem mensagens
          </div>
        ) : (
          messages.map((msg) => {
            if (msg.type === "system") {
              return (
                <div key={msg.id} className="text-center my-4">
                  <span className="bg-yellow-200 text-black px-4 py-1 text-xs font-black uppercase border-2 border-black inline-block transform rotate-1">
                    {msg.text}
                  </span>
                </div>
              );
            }

            const isMe = msg.userId === currentUserId;
            
            let timeStr = "AGORA";
            if (msg.timestamp) {
              const dt = msg.timestamp.toDate ? msg.timestamp.toDate() : new Date(msg.timestamp);
              timeStr = dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
            }

            return (
              <div 
                key={msg.id} 
                className={`flex gap-3 ${isMe ? "justify-end" : "justify-start"}`}
              >
                {!isMe && (
                  <div className="shrink-0 mt-1">
                    <UserAvatar src={msg.photoUrl} name={msg.sender || "U"} size="sm" />
                  </div>
                )}
                
                <div className={`flex flex-col max-w-[80%] ${isMe ? "items-end" : "items-start"}`}>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="font-black text-xs text-black uppercase">{isMe ? "VOCÊ" : msg.sender}</span>
                    <span className="text-[9px] font-bold text-gray-400 tracking-wider">{timeStr}</span>
                  </div>
                  <div 
                    className={`p-3 text-sm font-bold border-2 border-black break-words leading-snug whitespace-pre-wrap ${
                      isMe ? "bg-theme text-white border-theme" : "bg-gray-100 text-black border-black"
                    }`}
                  >
                    {msg.imageUrl && (
                      <img src={msg.imageUrl} alt="Meme" className="w-full max-w-[200px] h-auto rounded-sm mb-2 border-2 border-black shadow-[2px_2px_0px_0px_#000]" referrerPolicy="no-referrer" crossOrigin="anonymous" />
                    )}
                    {msg.text && <span>{msg.text}</span>}
                  </div>
                </div>

                {isMe && (
                  <div className="shrink-0 mt-1">
                    <UserAvatar src={msg.photoUrl} name={msg.sender || "U"} size="sm" />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      
      {showMemes && (
        <div className="absolute bottom-20 left-4 right-4 bg-white border-4 border-black p-3 space-y-2 z-50 animate-in slide-in-from-bottom-5">
          <div className="flex justify-between items-center mb-2">
            <span className="font-black italic uppercase text-xs">GIFs (GIPHY)</span>
            <button type="button" onClick={() => setShowMemes(false)} className="text-[10px] font-black uppercase text-gray-400 hover:text-black">FECHAR</button>
          </div>
          <div className="relative mb-2 block w-full">
            <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input 
              type="text" 
              value={memeSearchQuery}
              onChange={(e) => setMemeSearchQuery(e.target.value)}
              placeholder="BUSCAR MEMES NO GIPHY..."
              style={{ color: "black", backgroundColor: "white" }}
              className="w-full border-2 border-black pl-8 pr-3 py-2 font-bold uppercase text-xs focus:outline-none focus:ring-2 focus:ring-black placeholder-gray-500 text-black placeholder:text-gray-500"
            />
          </div>
          <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto pr-1 min-h-[100px] relative">
            {isSearchingMemes ? (
               <div className="absolute inset-0 flex items-center justify-center bg-white/50">
                 <Loader2 className="w-6 h-6 animate-spin text-black" />
               </div>
             ) : memeResults.length === 0 ? (
               <div className="col-span-4 text-center py-4 text-xs font-bold text-gray-400 uppercase">NENHUM RESULTADO</div>
             ) : (
               memeResults.map(meme => (
                 <button
                   key={meme.id}
                   type="button"
                   onClick={() => handleSendMeme(meme.url)}
                   disabled={isSending}
                   className="border-2 border-transparent hover:border-black transition-colors"
                 >
                   <img src={meme.url} alt="GIF" className="w-full h-16 object-cover bg-gray-100" referrerPolicy="no-referrer" crossOrigin="anonymous" />
                 </button>
               ))
             )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-row gap-2 relative w-full items-stretch">
        <button
          type="button"
          onClick={() => setShowMemes(!showMemes)}
          className={`shrink-0 px-3 border-2 border-black transition-colors ${showMemes ? "bg-theme text-white" : "bg-white text-black hover:bg-gray-100"}`}
        >
          <Sticker className="w-6 h-6" />
        </button>
        <input 
          type="text" 
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="ESCREVA SUA MENSAGEM..."
          maxLength={200}
          disabled={isSending}
          style={{ color: "black" }}
          className="flex-1 w-full min-w-0 bg-white border-2 border-black text-black px-4 py-3 font-bold uppercase text-sm md:text-base focus:outline-none focus:border-theme placeholder-gray-500"
        />
        <button 
          type="submit"
          disabled={isSending || (!inputText.trim() && !isSending && !showMemes)}
          className="shrink-0 bg-black hover:bg-theme text-white px-4 md:px-5 border-2 border-black transition-colors disabled:opacity-50"
        >
          <Send className="w-5 h-5 -rotate-45" />
        </button>
      </form>

    </div>
  );
}
