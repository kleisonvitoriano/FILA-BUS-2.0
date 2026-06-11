import React, { useState } from "react";
import { motion } from "motion/react";
import { Eye, EyeOff, Mail, Lock, Phone } from "lucide-react";

interface AuthScreenProps {
  onLogin: (email: string, pass: string) => Promise<void>;
  onRegister: (email: string, pass: string, phone: string) => Promise<void>;
  onForgotPassword: (email: string) => Promise<void>;
  isLoading: boolean;
}

export default function AuthScreen({ onLogin, onRegister, onForgotPassword, isLoading }: AuthScreenProps) {
  const [activeTab, setActiveTab] = useState<"login" | "register" | "forgot">("login");
  
  // Login fields
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPass, setShowLoginPass] = useState(false);

  // Forgot password field
  const [forgotEmail, setForgotEmail] = useState("");

  // Register fields
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");
  const [registerPhone, setRegisterPhone] = useState("");
  const [showRegisterPass, setShowRegisterPass] = useState(false);
  const [showRegisterConfirmPass, setShowRegisterConfirmPass] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) return;
    await onLogin(loginEmail, loginPassword);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerEmail || !registerPassword) return;
    if (registerPassword !== registerConfirmPassword) {
      alert("As senhas não coincidem!");
      return;
    }
    await onRegister(registerEmail, registerPassword, registerPhone);
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    await onForgotPassword(forgotEmail);
  };

  return (
    <div className="w-full flex items-center justify-center py-6 px-4">
      <motion.div 
        initial={{ opacity: 0, y: 30, rotate: 1 }}
        animate={{ opacity: 1, y: 0, rotate: -0.5 }}
        transition={{ duration: 0.5, type: "spring" }}
        className="w-full max-w-md relative p-6 md:p-8 pt-10"
      >
        {/* Visual background wrapper to prevent absolute title clippage */}
        <div 
          className="absolute inset-0 bg-white border-4 border-black shadow-[10px_10px_0px_0px_var(--theme-primary)]"
          style={{
            clipPath: "polygon(0 3%, 100% 0, 100% 97%, 0 100%)",
            zIndex: 0
          }}
        />

        {/* Title overlay in Persona 5 visual mode */}
        <div 
          className="absolute -top-5 -left-4 bg-theme text-white px-5 py-2 font-black italic border-2 border-black tracking-wider text-xl uppercase"
          style={{
            transform: "rotate(-4deg)",
            boxShadow: "4px 4px 0px 0px #000000",
            zIndex: 10
          }}
        >
          {activeTab === "login" ? "IDENTIFICAÇÃO" : activeTab === "register" ? "REGISTRO" : "RECUPERAÇÃO"}
        </div>

        <div className="relative z-10">

        {/* Tab buttons */}
        <div className="flex border-b-4 border-black mt-4 mb-6">
          <button
            type="button"
            onClick={() => setActiveTab("login")}
            className={`flex-1 py-3 text-center text-lg font-black uppercase italic transition-all ${
              activeTab === "login" || activeTab === "forgot"
                ? "bg-theme text-white border-b-0" 
                : "text-gray-500 hover:text-black"
            }`}
          >
            ENTRAR
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("register")}
            className={`flex-1 py-3 text-center text-lg font-black uppercase italic transition-all ${
              activeTab === "register" 
                ? "bg-theme text-white border-b-0" 
                : "text-gray-500 hover:text-black"
            }`}
          >
            REGISTRAR
          </button>
        </div>

        {/* Forms with motion */}
        {activeTab === "login" ? (
          <motion.form 
            key="login"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            onSubmit={handleLoginSubmit}
            className="space-y-5"
          >
            <div>
              <label className="block text-black font-black uppercase text-sm mb-1 italic tracking-wider">
                EMAIL // ID
              </label>
              <div className="relative">
                <input 
                  type="email" 
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="EXEMPLO@EMAIL.COM" 
                  disabled={isLoading}
                  required
                  className="w-full bg-black text-white p-3 font-bold border-2 border-theme focus:outline-none focus:border-white shadow-[4px_4px_0_0_var(--theme-primary)] rounded-none placeholder-gray-500 text-sm"
                />
                <Mail className="absolute right-3 top-3 w-5 h-5 text-gray-500" />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-black font-black uppercase text-sm italic tracking-wider">
                  SENHA
                </label>
                <button
                  type="button"
                  onClick={() => setActiveTab("forgot")}
                  className="text-xs text-theme hover:text-black font-black uppercase italic tracking-widest cursor-pointer underline decoration-dotted decoration-2"
                >
                  Esqueceu?
                </button>
              </div>
              <div className="relative">
                <input 
                  type={showLoginPass ? "text" : "password"}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••" 
                  disabled={isLoading}
                  required
                  className="w-full bg-black text-white p-3 font-bold border-2 border-theme focus:outline-none focus:border-white shadow-[4px_4px_0_0_var(--theme-primary)] rounded-none placeholder-gray-500 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPass(!showLoginPass)}
                  className="absolute right-3 top-3 text-gray-500 hover:text-theme"
                >
                  {showLoginPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-theme text-white font-black text-xl italic p-3 mt-4 shadow-solid-black hover:bg-black hover:text-theme transition-all border-4 border-black disabled:opacity-50"
              style={{
                boxShadow: "4px 4px 0px 0px #000000"
              }}
            >
              {isLoading ? "ENTRANDO..." : "ACESSAR SISTEMA"}
            </button>
          </motion.form>
        ) : activeTab === "register" ? (
          <motion.form 
            key="register"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            onSubmit={handleRegisterSubmit}
            className="space-y-4"
          >
            <div>
              <label className="block text-black font-black uppercase text-sm mb-1 italic tracking-wider">
                EMAIL DO USUÁRIO
              </label>
              <div className="relative">
                <input 
                  type="email" 
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  placeholder="EXEMPLO@EMAIL.COM" 
                  disabled={isLoading}
                  required
                  className="w-full bg-black text-white p-3 font-bold border-2 border-theme focus:outline-none focus:border-white shadow-[4px_4px_0_0_var(--theme-primary)] rounded-none placeholder-gray-500 text-sm"
                />
                <Mail className="absolute right-3 top-3 w-5 h-5 text-gray-500" />
              </div>
            </div>

            <div>
              <label className="block text-black font-black uppercase text-sm mb-1 italic tracking-wider">
                CELULAR // WHATSAPP
              </label>
              <div className="relative">
                <input 
                  type="tel" 
                  value={registerPhone}
                  onChange={(e) => setRegisterPhone(e.target.value)}
                  placeholder="(DDD) 99999-9999" 
                  disabled={isLoading}
                  className="w-full bg-black text-white p-3 font-bold border-2 border-theme focus:outline-none focus:border-white shadow-[4px_4px_0_0_var(--theme-primary)] rounded-none placeholder-gray-500 text-sm"
                />
                <Phone className="absolute right-3 top-3 w-5 h-5 text-gray-500" />
              </div>
            </div>

            <div>
              <label className="block text-black font-black uppercase text-sm mb-1 italic tracking-wider">
                CRIAR SENHA (MÍN. 6 DÍGITOS)
              </label>
              <div className="relative">
                <input 
                  type={showRegisterPass ? "text" : "password"}
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  placeholder="••••••••" 
                  disabled={isLoading}
                  required
                  className="w-full bg-black text-white p-3 font-bold border-2 border-theme focus:outline-none focus:border-white shadow-[4px_4px_0_0_var(--theme-primary)] rounded-none placeholder-gray-500 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowRegisterPass(!showRegisterPass)}
                  className="absolute right-3 top-3 text-gray-500 hover:text-theme"
                >
                  {showRegisterPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-black font-black uppercase text-sm mb-1 italic tracking-wider">
                CONFIRME A SENHA
              </label>
              <div className="relative">
                <input 
                  type={showRegisterConfirmPass ? "text" : "password"}
                  value={registerConfirmPassword}
                  onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                  placeholder="••••••••" 
                  disabled={isLoading}
                  required
                  className="w-full bg-black text-white p-3 font-bold border-2 border-theme focus:outline-none focus:border-white shadow-[4px_4px_0_0_var(--theme-primary)] rounded-none placeholder-gray-500 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowRegisterConfirmPass(!showRegisterConfirmPass)}
                  className="absolute right-3 top-3 text-gray-500 hover:text-theme"
                >
                  {showRegisterConfirmPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-emerald-600 text-white font-black text-xl italic p-3 mt-4 shadow-solid-black hover:bg-black hover:text-emerald-500 transition-all border-4 border-black disabled:opacity-50"
              style={{
                boxShadow: "4px 4px 0px 0px #000000"
              }}
            >
              {isLoading ? "REGISTRANDO..." : "CONCLUIR CADASTRO"}
            </button>
          </motion.form>
        ) : (
          <motion.form 
            key="forgot"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onSubmit={handleForgotSubmit}
            className="space-y-5"
          >
            <div className="bg-amber-100 border-2 border-black p-3 text-xs text-black font-medium leading-relaxed tracking-wide">
              MANDAREMOS UM LINK DE RECUPERAÇÃO PARA O SEU E-MAIL ADAPTADO DE ACORDO COM O SISTEMA.
            </div>

            <div>
              <label className="block text-black font-black uppercase text-sm mb-1 italic tracking-wider">
                EMAIL CADASTRADO
              </label>
              <div className="relative">
                <input 
                  type="email" 
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="EXEMPLO@EMAIL.COM" 
                  disabled={isLoading}
                  required
                  className="w-full bg-black text-white p-3 font-bold border-2 border-theme focus:outline-none focus:border-white shadow-[4px_4px_0_0_var(--theme-primary)] rounded-none placeholder-gray-500 text-sm"
                />
                <Mail className="absolute right-3 top-3 w-5 h-5 text-gray-500" />
              </div>
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-theme text-white font-black text-xl italic p-3 mt-2 shadow-solid-black hover:bg-black hover:text-theme transition-all border-4 border-black disabled:opacity-50"
              style={{
                boxShadow: "4px 4px 0px 0px #000000"
              }}
            >
              {isLoading ? "ENVIANDO..." : "ENVIAR EMAIL DE RECUPERAÇÃO"}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setActiveTab("login")}
                className="text-xs text-black font-black tracking-widest hover:underline uppercase italic cursor-pointer"
              >
                ← Voltar para login
              </button>
            </div>
          </motion.form>
        )}
        </div>
      </motion.div>
    </div>
  );
}
