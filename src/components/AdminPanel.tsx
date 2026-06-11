import React, { useState } from "react";
import { motion } from "motion/react";
import { Trash2, History, Settings } from "lucide-react";

interface AdminPanelProps {
  openTime: string;
  closeTime: string;
  onSaveSchedule: (open: string, close: string) => Promise<void>;
  onResetQueue: () => Promise<void>;
  onViewLogs: () => void;
}

export default function AdminPanel({
  openTime,
  closeTime,
  onSaveSchedule,
  onResetQueue,
  onViewLogs
}: AdminPanelProps) {
  const [localOpen, setLocalOpen] = useState(openTime || "");
  const [localClose, setLocalClose] = useState(closeTime || "");
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    setLocalOpen(openTime || "");
  }, [openTime]);

  React.useEffect(() => {
    setLocalClose(closeTime || "");
  }, [closeTime]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveSchedule(localOpen, localClose);
    } catch (e) {
      // Error handled
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.section 
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="relative mt-8 p-5 pt-8"
    >
      {/* Visual background wrapper to prevent absolute title clippage */}
      <div 
        className="absolute inset-0 bg-black border-4 border-yellow-500 shadow-[6px_6px_0_0_#eab308]"
        style={{
          clipPath: "polygon(0 2%, 100% 0, 98% 98%, 1% 100%)",
          zIndex: 0
        }}
      />

      {/* Title block with yellow shadow */}
      <div 
        className="absolute -top-4 left-4 bg-yellow-500 text-black font-black italic px-4 py-1.5 text-lg border-2 border-black tracking-wider uppercase select-none"
        style={{
          transform: "rotate(-2deg)",
          boxShadow: "3px 3px 0px 0px #000000",
          zIndex: 10
        }}
      >
        PAINEL ADMIN
      </div>

      <div className="relative z-10">
        <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-yellow-500 uppercase font-black tracking-wider mb-1 block italic">
            ABERTURA
          </label>
          <input 
            type="time" 
            value={localOpen}
            onChange={(e) => setLocalOpen(e.target.value)}
            className="w-full bg-transparent border-2 border-yellow-500 text-white font-black p-2.5 rounded-none focus:outline-none focus:border-theme text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-yellow-500 uppercase font-black tracking-wider mb-1 block italic">
            FECHAMENTO
          </label>
          <input 
            type="time" 
            value={localClose}
            onChange={(e) => setLocalClose(e.target.value)}
            className="w-full bg-transparent border-2 border-yellow-500 text-white font-black p-2.5 rounded-none focus:outline-none focus:border-theme text-sm"
          />
        </div>
      </div>

      <button 
        type="button"
        onClick={handleSave}
        disabled={isSaving}
        className="w-full bg-yellow-500 text-black font-black italic uppercase py-3.5 mt-5 border-2 border-black hover:bg-theme hover:text-white transition-all shadow-[3px_3px_0_0_#000000] active:scale-95 text-md"
      >
        {isSaving ? "SALVANDO..." : "SALVAR HORÁRIOS"}
      </button>

      <div className="flex gap-3 mt-3">
        <button 
          type="button"
          onClick={onResetQueue}
          className="flex-1 bg-theme text-white font-black italic uppercase py-2.5 border-2 border-black flex items-center justify-center gap-1.5 shadow-[3px_3px_0_0_#000000] active:scale-95 text-xs md:text-sm hover:bg-white hover:text-theme transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          ZERAR FILA
        </button>
        <button 
          type="button"
          onClick={onViewLogs}
          className="flex-1 bg-white text-black font-black italic uppercase py-2.5 border-2 border-black flex items-center justify-center gap-1.5 shadow-[3px_3px_0_0_#000000] active:scale-95 text-xs md:text-sm hover:bg-yellow-500 hover:text-black"
        >
          <History className="w-4 h-4" />
          HISTÓRICO
        </button>
      </div>
      </div>
    </motion.section>
  );
}
