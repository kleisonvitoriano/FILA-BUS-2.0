import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { LogOut, Plus, Ticket } from "lucide-react";
import { Queue } from "../types";

interface QueueSelectionProps {
  queues: Queue[];
  onSelectQueue: (id: string) => void;
  onJoinQueueByCode: (code: string) => Promise<void>;
  onCreateQueue?: (name: string, code: string) => Promise<void>;
  onLogout: () => void;
  isAdmin: boolean;
  timeString: string;
  isTimeSynced: boolean;
}

export default function QueueSelection({
  queues,
  onSelectQueue,
  onJoinQueueByCode,
  onCreateQueue,
  onLogout,
  isAdmin,
  timeString,
  isTimeSynced
}: QueueSelectionProps) {
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [queueCode, setQueueCode] = useState("");
  
  // Create queue states
  const [newQueueName, setNewQueueName] = useState("");
  const [newQueueCode, setNewQueueCode] = useState("");

  const [isLoading, setIsLoading] = useState(false);

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!queueCode.trim()) return;
    setIsLoading(true);
    try {
      await onJoinQueueByCode(queueCode.trim().toUpperCase());
      setQueueCode("");
      setShowJoinModal(false);
    } catch (e) {
      // Handled by parent alerts
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQueueName.trim() || !newQueueCode.trim() || !onCreateQueue) return;
    setIsLoading(true);
    try {
      await onCreateQueue(newQueueName.trim(), newQueueCode.trim().toUpperCase());
      setNewQueueName("");
      setNewQueueCode("");
      setShowCreateModal(false);
    } catch (e) {
      // Handled by parent
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6 px-4">
      {/* Dynamic Clock Section */}
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-black border-4 border-white p-4 relative text-center mx-auto"
        style={{
          boxShadow: "5px 5px 0px 0px var(--theme-primary)",
          clipPath: "polygon(0 15%, 100% 0, 100% 85%, 0 100%)",
          maxWidth: "320px"
        }}
      >
        <div className="text-[10px] tracking-widest font-black uppercase mb-1 flex items-center justify-center gap-1.5 md:gap-2 text-theme">
          <span className={`w-2.5 h-2.5 rounded-full ${isTimeSynced ? "bg-green-500" : "bg-yellow-500 animate-pulse"}`} />
          {isTimeSynced ? "SISTEMA SINCRONIZADO" : "SINCRONIZANDO..."}
        </div>
        <div className="text-4xl font-mono font-black italic text-white tracking-widest" style={{ textShadow: "2px 2px 0px var(--theme-primary)" }}>
          {timeString || "00:00:00"}
        </div>
      </motion.div>

      {/* Main Container */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-black border-4 border-white p-6 relative"
        style={{
          boxShadow: "8px 8px 0px 0px var(--theme-primary)"
        }}
      >
        <h2 className="text-2xl font-black text-center text-white italic tracking-tight uppercase mb-6" style={{ textShadow: "2px 2px 0px var(--theme-primary)" }}>
          MINHAS FILAS
        </h2>

        {/* Queues list */}
        <div className="space-y-4 max-h-[320px] overflow-y-auto pr-1">
          {queues.length === 0 ? (
            <div className="text-center py-6 border-2 border-dashed border-gray-700 text-gray-500 font-bold italic">
              NENHUMA FILA VINCULADA
            </div>
          ) : (
            queues.map((q, index) => (
              <motion.div
                key={q.id}
                whileActive={{ scale: 0.98 }}
                onClick={() => onSelectQueue(q.id)}
                className="bg-white hover:bg-theme group text-black p-4 border-2 border-black cursor-pointer transition-colors relative"
                style={{
                  transform: `rotate(${index % 2 === 0 ? -1 : 1.5}deg)`,
                  boxShadow: "4px 4px 0px 0px var(--theme-primary)"
                }}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-black text-lg group-hover:text-white uppercase transition-colors">
                      {q.name}
                    </h3>
                    <p className="text-xs font-mono font-bold text-gray-500 group-hover:text-white group-hover:opacity-90 uppercase tracking-wider transition-colors mt-1">
                      CÓDIGO: {q.code}
                    </p>
                  </div>
                  <Ticket className="w-6 h-6 text-theme group-hover:text-white transition-colors" />
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Buttons section */}
        <div className="space-y-3 pt-6 mt-4 border-t-2 border-dashed border-gray-800">
          <button
            type="button"
            onClick={() => setShowJoinModal(true)}
            className="w-full bg-white hover:bg-black hover:text-white text-black font-black italic uppercase py-3 border-4 border-black transition-all hover:shadow-[3px_3px_0_0_#ffffff]"
            style={{
              boxShadow: "4px 4px 0px 0px var(--theme-primary)"
            }}
          >
            ENTRAR POR CÓDIGO
          </button>

          {isAdmin && onCreateQueue && (
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="w-full bg-yellow-500 hover:bg-white text-black font-black italic uppercase py-3 border-4 border-black shadow-[4px_4px_0_0_#000000] transition-colors"
            >
              CRIAR NOVA FILA
            </button>
          )}

          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 hover:bg-theme hover:text-white text-theme font-black italic uppercase py-2.5 mt-2 text-sm transition-colors"
          >
            <LogOut className="w-4 h-4" />
            SAIR DA CONTA
          </button>
        </div>
      </motion.div>

      {/* Join Queue Modal */}
      <AnimatePresence>
        {showJoinModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
            <motion.div
              initial={{ scale: 0.9, rotate: 2, opacity: 0 }}
              animate={{ scale: 1, rotate: -1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white p-6 md:p-8 border-4 border-black w-full max-w-sm relative"
              style={{
                boxShadow: "8px 8px 0px 0px var(--theme-primary)"
              }}
            >
              <h3 className="text-xl font-black text-center text-black italic uppercase mb-4">
                DIGITE O CÓDIGO DA FILA
              </h3>
              <form onSubmit={handleJoinSubmit} className="space-y-5">
                <input
                  type="text"
                  value={queueCode}
                  onChange={(e) => setQueueCode(e.target.value)}
                  placeholder="CÓDIGO"
                  disabled={isLoading}
                  required
                  maxLength={12}
                  className="w-full bg-black text-white py-3 text-center tracking-[0.2em] font-mono font-black uppercase border-4 border-theme focus:outline-none focus:border-black focus:bg-white focus:text-black text-lg"
                />
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setShowJoinModal(false)}
                    disabled={isLoading}
                    className="bg-black hover:bg-theme text-white hover:text-white font-black italic uppercase py-3 border-2 border-black transition-colors"
                  >
                    CANCELAR
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="bg-theme hover:bg-black text-white font-black italic uppercase py-3 border-2 border-black disabled:opacity-50 transition-all"
                    style={{
                      boxShadow: "3px 3px 0 0 #000000"
                    }}
                  >
                    {isLoading ? "ENTRANDO..." : "CONFIRMAR"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Queue Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4">
            <motion.div
              initial={{ scale: 0.9, rotate: -2, opacity: 0 }}
              animate={{ scale: 1, rotate: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white p-6 border-4 border-black w-full max-w-sm relative"
              style={{
                boxShadow: "8px 8px 0px 0px #eab308"
              }}
            >
              <h3 className="text-xl font-black text-center text-black italic uppercase mb-4">
                CONFIGURAR NOVA FILA
              </h3>
              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div>
                  <label className="block text-black font-black uppercase text-xs mb-1 italic">NOME DA LINHA / FILA</label>
                  <input
                    type="text"
                    value={newQueueName}
                    onChange={(e) => setNewQueueName(e.target.value)}
                    placeholder="EX: CAMPUS EXPRESSO"
                    disabled={isLoading}
                    required
                    className="w-full bg-black text-white p-3 font-bold border-2 border-yellow-500 focus:bg-white focus:text-black focus:outline-none text-sm uppercase"
                  />
                </div>
                <div>
                  <label className="block text-black font-black uppercase text-xs mb-1 italic">CÓDIGO DE ACESSO</label>
                  <input
                    type="text"
                    value={newQueueCode}
                    onChange={(e) => setNewQueueCode(e.target.value)}
                    placeholder="EX: CAMPUS2026"
                    disabled={isLoading}
                    required
                    className="w-full bg-black text-white p-3 font-mono font-black border-2 border-yellow-500 focus:bg-white focus:text-black focus:outline-none text-sm uppercase"
                  />
                  <span className="text-[10px] text-gray-500 mt-1 block">O código de acesso que os passageiros usarão para entrar.</span>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    disabled={isLoading}
                    className="bg-black text-white font-black italic uppercase py-3 border-2 border-black"
                  >
                    CANCELAR
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="bg-yellow-500 text-black font-black italic uppercase py-3 border-2 border-black shadow-[3px_3px_0_0_#000000] disabled:opacity-50"
                  >
                    {isLoading ? "SALVANDO..." : "CRIAR FILA"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
