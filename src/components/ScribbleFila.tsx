import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { db, auth, handleFirestoreError, OperationType } from "../firebase";
import { doc, onSnapshot, setDoc, updateDoc, increment, serverTimestamp } from "firebase/firestore";
import { UserProfile } from "../types";
import { 
  Gamepad2, Users, Trophy, Sparkles, Volume2, VolumeX, 
  Trash2, Undo, Palette, HelpCircle, Edit3, Send, Play, CheckCircle
} from "lucide-react";

interface ScribbleFilaProps {
  queueId: string | null;
  userProfile: UserProfile | null;
}

interface Stroke {
  points: number[]; // x, y pairs stored as coordinate percentages (0-100)
  color: string;
  width: number;
}

interface PlayerRecord {
  uid: string;
  name: string;
  photoUrl: string;
  score: number;
  lastActive: number;
}

interface GameState {
  drawerUid: string;
  drawerName: string;
  category: string;
  obfuscatedWord: string; // Base64
  hint: string;
  status: "idle" | "drawing" | "reveal";
  roundNum: number;
  winnerUid: string;
  winnerName: string;
  revealedWord: string;
  roundStartedAt: any;
}

interface GuessMessage {
  id: string;
  userId: string;
  sender: string;
  text: string;
  isCorrect: boolean;
  timeStr: string;
}

// Slang/Funny words for drawing
const GAME_WORDS = [
  { word: "ONIBUS", category: "No Ônibus" },
  { word: "CATRACA", category: "No Ônibus" },
  { word: "MOTORISTA", category: "No Ônibus" },
  { word: "COBRADOR", category: "No Ônibus" },
  { word: "PASSAGEM", category: "No Ônibus" },
  { word: "VALIDADOR", category: "No Ônibus" },
  { word: "ASSENTO", category: "No Ônibus" },
  { word: "FECHADO", category: "No Ônibus" },
  { word: "VAN", category: "No Ônibus" },
  { word: "PARADA", category: "No Ônibus" },
  { word: "MURAL", category: "No Ônibus" },
  { word: "INTEGRACAO", category: "No Ônibus" },
  { word: "ENGARRAFAMENTO", category: "Trânsito Caótico" },
  { word: "SINAL", category: "Trânsito Caótico" },
  { word: "CHUVA", category: "Trânsito Caótico" },
  { word: "PNEU", category: "Trânsito Caótico" },
  { word: "BLITZE", category: "Trânsito Caótico" },
  { word: "ROTATORIA", category: "Trânsito Caótico" },
  { word: "VIADUTO", category: "Trânsito Caótico" },
  { word: "BUZINA", category: "Trânsito Caótico" },
  { word: "PEDESTRE", category: "Trânsito Caótico" },
  { word: "FAIXA", category: "Trânsito Caótico" },
  { word: "LIVRO", category: "Vida Universitária" },
  { word: "PROVA", category: "Vida Universitária" },
  { word: "MOCHILA", category: "Vida Universitária" },
  { word: "ATRASADO", category: "Vida Universitária" },
  { word: "DIPLOMA", category: "Vida Universitária" },
  { word: "COLOQUIO", category: "Vida Universitária" },
  { word: "REITORIA", category: "Vida Universitária" },
  { word: "XEROX", category: "Vida Universitária" },
  { word: "GATO", category: "Geral Divertido" },
  { word: "BANANA", category: "Geral Divertido" },
  { word: "SOL", category: "Geral Divertido" },
  { word: "PIZZA", category: "Geral Divertido" },
  { word: "FLOR", category: "Geral Divertido" },
  { word: "CELULAR", category: "Geral Divertido" },
  { word: "CASA", category: "Geral Divertido" },
  { word: "BOLO", category: "Geral Divertido" },
  { word: "CORACAO", category: "Geral Divertido" },
  { word: "FANTASMA", category: "Geral Divertido" },
  { word: "AVIAO", category: "Geral Divertido" },
  { word: "CASTELO", category: "Geral Divertido" },
  { word: "CHAVE", category: "Geral Divertido" }
];

const COLORS = [
  "#000000", // Preto
  "#E60012", // Vermelho Persona
  "#0000FF", // Azul
  "#00FF00", // Verde
  "#FFFF00", // Amarelo Persona
  "#FFA500", // Laranja
  "#800080", // Roxo
  "#FFFFFF"  // Borracha (Branco)
];

const BRUSH_SIZES = [3, 6, 12, 20];

export default function ScribbleFila({ queueId, userProfile }: ScribbleFilaProps) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [players, setPlayers] = useState<{ [uid: string]: PlayerRecord }>({});
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [guesses, setGuesses] = useState<GuessMessage[]>([]);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Drawing Tools State
  const [currentColor, setCurrentColor] = useState<string>("#000000");
  const [currentSize, setCurrentSize] = useState<number>(6);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [currentPoints, setCurrentPoints] = useState<number[]>([]);

  // Local Guessing Text
  const [localGuess, setLocalGuess] = useState<string>("");

  // Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const guessContainerRef = useRef<HTMLDivElement | null>(null);

  const me = auth.currentUser;

  // Sound synthesis function
  const playSound = (type: "correct" | "pop" | "draw" | "clear" | "success" | "buzzer") => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "pop") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === "draw") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.setValueAtTime(220, now + 0.05);
        gain.gain.setValueAtTime(0.02, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === "clear") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.3);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === "correct") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
        osc.frequency.setValueAtTime(1046.50, now + 0.3); // C6
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.55);
        osc.start(now);
        osc.stop(now + 0.6);
      } else if (type === "buzzer") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(130, now);
        osc.frequency.setValueAtTime(110, now + 0.15);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.45);
      } else if (type === "success") {
        osc.type = "square";
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(880, now + 0.15);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.35);
      }
    } catch (e) {
      console.warn("Audio Synthesis Failed", e);
    }
  };

  // Sync game states with Firestore in a robust unified match path
  useEffect(() => {
    if (!queueId) return;

    // 1. Subscribe to game state
    const stateDocRef = doc(db, "queues", queueId, "game", "state");
    const unsubState = onSnapshot(stateDocRef, async (snap) => {
      if (snap.exists()) {
        setGameState(snap.data() as GameState);
      } else {
        // Initialize State
        const defaultState: GameState = {
          drawerUid: "",
          drawerName: "",
          category: "Transporte",
          obfuscatedWord: "",
          hint: "",
          status: "idle",
          roundNum: 0,
          winnerUid: "",
          winnerName: "",
          revealedWord: "",
          roundStartedAt: null
        };
        try {
          await setDoc(stateDocRef, defaultState);
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `queues/${queueId}/game/state`);
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `queues/${queueId}/game/state`);
    });

    // 2. Subscribe to canvas
    const canvasDocRef = doc(db, "queues", queueId, "game", "canvas");
    const unsubCanvas = onSnapshot(canvasDocRef, async (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setStrokes(data.strokes || []);
      } else {
        try {
          await setDoc(canvasDocRef, { strokes: [] });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `queues/${queueId}/game/canvas`);
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `queues/${queueId}/game/canvas`);
    });

    // 3. Subscribe to scoreboard players
    const playersDocRef = doc(db, "queues", queueId, "game", "players");
    const unsubPlayers = onSnapshot(playersDocRef, async (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setPlayers(data.players || {});
      } else {
        try {
          await setDoc(playersDocRef, { players: {} });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `queues/${queueId}/game/players`);
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `queues/${queueId}/game/players`);
    });

    // 4. Subscribe to guesses/guesses sub-messages
    const guessesDocRef = doc(db, "queues", queueId, "game", "guesses");
    const unsubGuesses = onSnapshot(guessesDocRef, async (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setGuesses(data.recentGuesses || []);
        // Autoscroll chat
        setTimeout(() => {
          if (guessContainerRef.current) {
            guessContainerRef.current.scrollTop = guessContainerRef.current.scrollHeight;
          }
        }, 100);
      } else {
        try {
          await setDoc(guessesDocRef, { recentGuesses: [] });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `queues/${queueId}/game/guesses`);
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `queues/${queueId}/game/guesses`);
    });

    return () => {
      unsubState();
      unsubCanvas();
      unsubPlayers();
      unsubGuesses();
    };
  }, [queueId]);

  // Join Game scoreboard on entering
  useEffect(() => {
    if (!queueId || !me || !userProfile) return;

    const joinScoreboard = async () => {
      const playersDocRef = doc(db, "queues", queueId, "game", "players");
      try {
        await setDoc(playersDocRef, {
          players: {
            [me.uid]: {
              uid: me.uid,
              name: userProfile.name || me.email?.split("@")[0] || "Passageiro",
              photoUrl: userProfile.photoUrl || "",
              score: players[me.uid]?.score || 0,
              lastActive: Date.now()
            }
          }
        }, { merge: true });
      } catch (err) {
        console.warn("Could not join lobby automatically", err);
      }
    };

    // Delay lookup slightly so `players` state can load first
    const t = setTimeout(joinScoreboard, 2000);
    return () => clearTimeout(t);
  }, [queueId, me, userProfile]);

  // Redraw canvas locally whenever strokes update
  useEffect(() => {
    drawCanvasOnScreen();
  }, [strokes, isDrawing, currentPoints]);

  const drawCanvasOnScreen = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid background to make it look blueprint/P5 aesthetic
    ctx.strokeStyle = "rgba(0,0,0,0.03)";
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 20) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.stroke();
    }
    for (let j = 0; j < canvas.height; j += 20) {
      ctx.beginPath();
      ctx.moveTo(0, j);
      ctx.lineTo(canvas.width, j);
      ctx.stroke();
    }

    // Draw all recorded strokes
    strokes.forEach((stroke) => {
      if (stroke.points.length < 4) return;
      ctx.beginPath();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;

      const px0 = (stroke.points[0] / 100) * canvas.width;
      const py0 = (stroke.points[1] / 100) * canvas.height;
      ctx.moveTo(px0, py0);

      for (let i = 2; i < stroke.points.length; i += 2) {
        const px = (stroke.points[i] / 100) * canvas.width;
        const py = (stroke.points[i+1] / 100) * canvas.height;
        ctx.lineTo(px, py);
      }
      ctx.stroke();
    });

    // Draw active local stroke if currently drawing
    if (isDrawing && currentPoints.length >= 4) {
      ctx.beginPath();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = currentSize;

      const px0 = (currentPoints[0] / 100) * canvas.width;
      const py0 = (currentPoints[1] / 100) * canvas.height;
      ctx.moveTo(px0, py0);

      for (let i = 2; i < currentPoints.length; i += 2) {
        const px = (currentPoints[i] / 100) * canvas.width;
        const py = (currentPoints[i+1] / 100) * canvas.height;
        ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
  };

  // Handle Select to Become Drawer
  const becomeDrawer = async () => {
    if (!queueId || !me || !userProfile) return;

    // Pick a random word from collection
    const randomIdx = Math.floor(Math.random() * GAME_WORDS.length);
    const item = GAME_WORDS[randomIdx];
    const uppercaseWord = item.word.toUpperCase();

    // Generate hints
    let firstChar = uppercaseWord.charAt(0);
    let restOfWordHint = uppercaseWord.slice(1).replace(/[A-Z]/g, " _");
    const hint = `${firstChar}${restOfWordHint}`;

    // Obfuscate using standard Base64 to prevent inspect element sniffing
    const obfuscated = btoa(uppercaseWord);

    try {
      const stateDocRef = doc(db, "queues", queueId, "game", "state");
      const canvasDocRef = doc(db, "queues", queueId, "game", "canvas");
      const guessesDocRef = doc(db, "queues", queueId, "game", "guesses");

      // Set State
      await setDoc(stateDocRef, {
        drawerUid: me.uid,
        drawerName: userProfile.name || me.email?.split("@")[0] || "Agente",
        category: item.category,
        obfuscatedWord: obfuscated,
        revealedWord: "",
        hint,
        status: "drawing",
        roundNum: (gameState?.roundNum || 0) + 1,
        winnerUid: "",
        winnerName: "",
        roundStartedAt: serverTimestamp()
      }, { merge: true });

      // Clean Canvas
      await setDoc(canvasDocRef, { strokes: [] });

      // Clean guesses
      await setDoc(guessesDocRef, {
        recentGuesses: [
          {
            id: String(Date.now()),
            userId: "system",
            sender: "MODERADOR",
            text: `🎮 NOVA RODADA INICIADA POR ${userProfile.name?.toUpperCase() || me.email?.split("@")[0].toUpperCase()}! CATEGORIA: ${item.category.toUpperCase()}`,
            isCorrect: false,
            timeStr: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          }
        ]
      });

      playSound("success");
    } catch (err) {
      console.error("Setup round error", err);
    }
  };

  // Convert raw coords into percentages
  const getCoordinatesFromEvent = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();

    let clientX = 0;
    let clientY = 0;

    if ("touches" in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x_percent = ((clientX - rect.left) / rect.width) * 100;
    const y_percent = ((clientY - rect.top) / rect.height) * 100;

    return { x: x_percent, y: y_percent };
  };

  // Drawing event handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    // Only drawer can draw
    if (!gameState || gameState.status !== "drawing" || gameState.drawerUid !== me?.uid) return;
    
    // Prevent default touch gestures to allow drawing on mobile
    if ("touches" in e) {
      e.preventDefault();
    }

    const pos = getCoordinatesFromEvent(e);
    if (!pos) return;

    setIsDrawing(true);
    setCurrentPoints([pos.x, pos.y]);
    playSound("draw");
  };

  const drawMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    if ("touches" in e) {
      e.preventDefault();
    }

    const pos = getCoordinatesFromEvent(e);
    if (!pos) return;

    setCurrentPoints((prev) => [...prev, pos.x, pos.y]);

    // Throttle click scratch sounds
    if (Math.random() < 0.2) {
      playSound("draw");
    }
  };

  const stopDrawing = async () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if (currentPoints.length < 4 || !queueId) return;

    // Save stroke to Firestore
    const newStroke: Stroke = {
      points: currentPoints,
      color: currentColor,
      width: currentSize,
    };

    const nextStrokes = [...strokes, newStroke];
    // Truncate strokes array if excessive to prevent doc size quote bloat
    if (nextStrokes.length > 50) {
      nextStrokes.shift();
    }

    setStrokes(nextStrokes);
    setCurrentPoints([]);

    try {
      const canvasDocRef = doc(db, "queues", queueId, "game", "canvas");
      await setDoc(canvasDocRef, { strokes: nextStrokes });
    } catch (err) {
      console.warn("Failed to push stroke to DB", err);
    }
  };

  // Undo Last Line
  const undoLastStroke = async () => {
    if (!queueId || strokes.length === 0) return;
    const nextStrokes = strokes.slice(0, -1);
    setStrokes(nextStrokes);
    playSound("pop");
    try {
      const canvasDocRef = doc(db, "queues", queueId, "game", "canvas");
      await setDoc(canvasDocRef, { strokes: nextStrokes });
    } catch (err) {
      console.warn("Undo stroke to DB failed", err);
    }
  };

  // Clear canvas completely
  const clearCanvas = async () => {
    if (!queueId) return;
    setStrokes([]);
    playSound("clear");
    try {
      const canvasDocRef = doc(db, "queues", queueId, "game", "canvas");
      await setDoc(canvasDocRef, { strokes: [] });
    } catch (err) {
      console.warn("Clear canvas in DB failed", err);
    }
  };

  // Handle Submitting a Guess in game chat
  const submitGuess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!queueId || !me || !userProfile || !gameState || !localGuess.trim()) return;

    const guessText = localGuess.trim();
    setLocalGuess("");

    // Read and slugify secret word
    const secretWord = atob(gameState.obfuscatedWord).toUpperCase().trim();
    const cleanGuess = guessText.toUpperCase().trim();

    // Check if correct
    const isCorrect = cleanGuess === secretWord;

    try {
      const guessesDocRef = doc(db, "queues", queueId, "game", "guesses");
      const stateDocRef = doc(db, "queues", queueId, "game", "state");
      const playersDocRef = doc(db, "queues", queueId, "game", "players");

      // Format clean hour stamp
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      // Add to array
      const addition: GuessMessage = {
        id: String(Date.now() + Math.random()),
        userId: me.uid,
        sender: userProfile.name || me.email?.split("@")[0] || "Advinha",
        text: isCorrect ? `🎉 CHUTOU CORRETAMENTE A PALAVRA: "${secretWord}"!` : guessText,
        isCorrect,
        timeStr
      };

      const nextGuesses = [...guesses, addition].slice(-30); // Keep last 30 guesses

      // Update Guesses Doc
      await setDoc(guessesDocRef, { recentGuesses: nextGuesses });

      if (isCorrect) {
        playSound("correct");

        // Set Winner State and Reveal the word
        await updateDoc(stateDocRef, {
          status: "reveal",
          winnerUid: me.uid,
          winnerName: userProfile.name || me.email?.split("@")[0] || "Ganhador",
          revealedWord: secretWord
        });

        // Add Score to Guesser (+15) and Drawer (+10)
        const updates: { [key: string]: any } = {
          [`players.${me.uid}.score`]: increment(15)
        };

        if (gameState.drawerUid) {
          updates[`players.${gameState.drawerUid}.score`] = increment(10);
        }

        await updateDoc(playersDocRef, updates);
      } else {
        playSound("pop");
      }
    } catch (err) {
      console.error("Guesser write failed", err);
    }
  };

  // Finish Round / Force Skip
  const revealAndReset = async () => {
    if (!queueId || !gameState) return;
    try {
      const stateDocRef = doc(db, "queues", queueId, "game", "state");
      const secretWord = atob(gameState.obfuscatedWord);

      await updateDoc(stateDocRef, {
        status: "reveal",
        revealedWord: secretWord,
        winnerUid: "",
        winnerName: "",
      });

      playSound("buzzer");
    } catch (err) {
      console.error("Reveal error", err);
    }
  };

  // Reset to Idle (allow next drawing)
  const resetToIdle = async () => {
    if (!queueId) return;
    try {
      const stateDocRef = doc(db, "queues", queueId, "game", "state");
      await setDoc(stateDocRef, {
        drawerUid: "",
        drawerName: "",
        category: "Misto",
        obfuscatedWord: "",
        revealedWord: "",
        hint: "",
        status: "idle",
        winnerUid: "",
        winnerName: "",
        roundStartedAt: null
      }, { merge: true });

      // Clear canvas
      await clearCanvas();
    } catch (err) {
      console.error("Reset idle error", err);
    }
  };

  // List of players sorted by score
  const sortedPlayers = useMemo(() => {
    return (Object.values(players) as PlayerRecord[]).sort((a, b) => b.score - a.score);
  }, [players]);

  if (!queueId) {
    return (
      <div className="relative mt-8 p-6 text-center bg-black border-4 border-white text-white"
        style={{
          boxShadow: "6px 6px 0px 0px var(--theme-primary)",
          clipPath: "polygon(0 2%, 100% 0, 98% 98%, 2% 96%)"
        }}
      >
        <Gamepad2 className="w-16 h-16 mx-auto mb-4 text-theme animate-bounce" />
        <h3 className="text-xl font-black italic uppercase tracking-wider mb-2">PENSOU... CHUTOU! 🎨</h3>
        <p className="text-xs text-gray-300 font-bold max-w-sm mx-auto leading-relaxed uppercase">
          POR FAVOR, SELECIONE UMA INTERFACE DE FILA NA ABA <span className="text-theme font-black">FILAS</span> PARA PODER ACESSAR O JOGO DE DESENHAR SÍNCRONO DA FILA!
        </p>
      </div>
    );
  }

  const isMyTurn = gameState && gameState.drawerUid === me?.uid;

  return (
    <div className="space-y-5">
      {/* Sound Controller Bar */}
      <div className="flex justify-between items-center bg-gray-900 border-2 border-black p-2.5"
        style={{ clipPath: "polygon(0.5% 0, 99.5% 3%, 99% 97%, 0.2% 100%)" }}
      >
        <div className="flex items-center gap-2">
          <Gamepad2 className="w-5 h-5 text-theme shrink-0" />
          <span className="text-xs font-black italic tracking-wider text-white uppercase">
            DESENHA E ADIVINHA DA FILA // MULTIJOGADOR
          </span>
        </div>
        <button
          type="button"
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="p-1 px-2 bg-black hover:bg-theme text-white border border-gray-700 hover:border-black text-[9px] font-bold flex items-center gap-1 uppercase transition-colors"
        >
          {soundEnabled ? (
            <>
              <Volume2 className="w-3.5 h-3.5" /> SOM LIGADO
            </>
          ) : (
            <>
              <VolumeX className="w-3.5 h-3.5 text-red-500" /> MUTADO
            </>
          )}
        </button>
      </div>

      {/* Main Game Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Left Side: Scoreboard (3 cols) */}
        <div className="lg:col-span-3 bg-black border-4 border-white text-white p-4 relative"
          style={{ clipPath: "polygon(0.2% 0, 100% 1.2%, 99% 98.5%, 0 97.5%)" }}
        >
          <h4 className="text-[10px] font-black tracking-widest text-theme uppercase mb-3 flex items-center justify-between border-b border-gray-800 pb-1.5">
            <span className="flex items-center gap-1"><Trophy className="w-3.5 h-3.5" /> PLACAR ATIVO</span>
            <span className="text-[8px] bg-red-600 text-white font-mono px-1.5">{sortedPlayers.length} JOGADORES</span>
          </h4>

          {/* Player Scoreboard listing */}
          <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
            {sortedPlayers.length === 0 ? (
              <span className="text-[10px] text-gray-500 font-bold block uppercase py-3 text-center">Nenhum jogador na sala</span>
            ) : (
              sortedPlayers.map((player, index) => {
                const isCurrentDrawer = gameState?.drawerUid === player.uid;
                const isMe = player.uid === me?.uid;

                return (
                  <div 
                    key={player.uid}
                    className={`p-2 border flex items-center justify-between transition-all ${
                      isCurrentDrawer 
                        ? "bg-red-900/30 border-[#E60012] text-white" 
                        : isMe 
                          ? "bg-yellow-500/10 border-yellow-500 text-white"
                          : "border-gray-800 bg-gray-950/50"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {player.photoUrl ? (
                        <img 
                          src={player.photoUrl} 
                          alt="" 
                          referrerPolicy="no-referrer"
                          className="w-5 h-5 rounded-none border border-black object-cover shrink-0" 
                        />
                      ) : (
                        <div className="w-5 h-5 bg-white text-black text-[9px] font-black flex items-center justify-center shrink-0">
                          {player.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="leading-none truncate">
                        <span className="text-[10px] font-black uppercase tracking-tight block truncate max-w-[110px]">
                          {index + 1}. {player.name}
                        </span>
                        {isCurrentDrawer && (
                          <span className="text-[7px] text-[#E60012] font-black uppercase">✏️ DESENHISTA</span>
                        )}
                        {!isCurrentDrawer && isMe && (
                          <span className="text-[7px] text-yellow-400 font-black uppercase">VOCÊ</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono text-xs font-black text-white">{player.score} pts</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Center: Main Canvas Drawing Area & Controls (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white border-4 border-black p-4 relative"
            style={{
              clipPath: "polygon(0 0, 100% 1%, 98.5% 100%, 1.5% 98%)",
              boxShadow: "5px 5px 0px 0px #000"
            }}
          >
            {/* Status Info Top Banner */}
            <div className="bg-black text-white p-2.5 flex items-center justify-between uppercase mb-3 text-[10px] font-black italic tracking-wide">
              {gameState?.status === "drawing" ? (
                <>
                  <span>✏️ DESENHISTA: <span className="text-[#FFFF00]">{gameState.drawerName}</span></span>
                  <span>CAT: {gameState.category}</span>
                </>
              ) : (
                <>
                  <span>⏱️ SALA DE ESPERA</span>
                  <span>AGUARDANDO PROXIMO DESENHISTA</span>
                </>
              )}
            </div>

            {/* Word / Hints Box */}
            <div className="text-center py-2.5 border-b-2 border-dashed border-gray-300 mb-3 select-none">
              {gameState?.status === "drawing" ? (
                isMyTurn ? (
                  <div className="space-y-1">
                    <span className="text-[8px] bg-red-600 px-1.5 py-0.5 text-white font-black uppercase">SUA PALAVRA SECRETA:</span>
                    <h3 className="text-2xl font-black text-[#E60012] uppercase tracking-widest">{atob(gameState.obfuscatedWord)}</h3>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <span className="text-[8px] bg-black px-1.5 py-0.5 text-white font-black uppercase">ADIVINHE A PALAVRA:</span>
                    <h3 className="text-xl font-mono font-black text-black tracking-[0.4rem] pt-1">{gameState.hint}</h3>
                  </div>
                )
              ) : gameState?.status === "reveal" ? (
                <div className="space-y-1 py-1">
                  <span className="text-[10px] text-red-600 font-extrabold block">RODADA ENCERRADA!</span>
                  <h3 className="text-xl font-black text-black uppercase">PALAVRA REVELADA: <span className="text-green-600">{gameState.revealedWord}</span></h3>
                  {gameState.winnerName ? (
                    <p className="text-[9px] font-black uppercase text-gray-500">🏆 Vitória de <span className="text-black font-black">{gameState.winnerName}</span>!</p>
                  ) : (
                    <p className="text-[9px] font-black uppercase text-gray-400">Ninguém adivinhou a tempo.</p>
                  )}
                </div>
              ) : (
                <div className="py-2">
                  <h3 className="text-sm font-black text-black">A LOUSA ESTÁ VAZIA</h3>
                  <p className="text-[9px] text-gray-500 uppercase font-bold">Seja o primeiro a desenhar clicando no botão vermelho abaixo!</p>
                </div>
              )}
            </div>

            {/* Visual Drawing Stage (Fixed ratio, responsive display) */}
            <div className="border-4 border-black bg-gray-50 aspect-[4/3] w-full relative overflow-hidden group">
              <canvas
                id="scribble-interactive-canvas"
                ref={canvasRef}
                width={500}
                height={375}
                onMouseDown={startDrawing}
                onMouseMove={drawMove}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={drawMove}
                onTouchEnd={stopDrawing}
                className={`w-full h-full block touch-none select-none ${
                  isMyTurn ? "cursor-pencil" : "cursor-not-allowed"
                }`}
              />

              {/* Guard overlay if not my turn */}
              {!isMyTurn && gameState?.status === "drawing" && (
                <div className="absolute top-2.5 right-2 bg-black border border-white text-white text-[7px] font-black p-1 uppercase opacity-80 pointer-events-none select-none">
                  🔒 TELA BLOQUEADA PERANTE CHUTES
                </div>
              )}
            </div>

            {/* Drawing controls for the Drawer only */}
            {isMyTurn && gameState?.status === "drawing" && (
              <div className="mt-4 p-3 bg-black text-white border-2 border-black space-y-3"
                style={{ clipPath: "polygon(0 0.5%, 100% 0, 99% 99%, 0.5% 100%)" }}
              >
                {/* Palette */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[8px] font-black text-gray-400 mr-1 flex items-center gap-0.5"><Palette className="w-3 h-3 text-theme" /> CORES:</span>
                  {COLORS.map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => {
                        setCurrentColor(col);
                        playSound("pop");
                      }}
                      className={`w-6 h-6 border-2 shrink-0 ${
                        currentColor === col ? "border-yellow-400 scale-110" : "border-gray-700 hover:border-gray-500"
                      }`}
                      style={{ backgroundColor: col }}
                      title={col === "#FFFFFF" ? "Borracha" : col}
                    />
                  ))}
                </div>

                {/* Size Controls and Clear action */}
                <div className="flex justify-between items-center flex-wrap gap-3 border-t border-gray-800 pt-2">
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[8px] font-black text-gray-400 mr-1 flex items-center gap-0.5"><Edit3 className="w-3 h-3 text-theme" /> PINCEL:</span>
                    {BRUSH_SIZES.map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => {
                          setCurrentSize(sz);
                          playSound("pop");
                        }}
                        className={`px-2.5 py-1 text-[9px] font-black text-black bg-white hover:bg-yellow-400 border border-black ${
                          currentSize === sz ? "bg-yellow-400 scale-105" : ""
                        }`}
                      >
                        {sz}px
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={undoLastStroke}
                      disabled={strokes.length === 0}
                      className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-white font-black text-[9px] flex items-center gap-1 uppercase transition-colors"
                    >
                      <Undo className="w-3 h-3" /> Desfazer
                    </button>
                    <button
                      type="button"
                      onClick={clearCanvas}
                      disabled={strokes.length === 0}
                      className="px-2.5 py-1 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white font-black text-[9px] flex items-center gap-1 uppercase transition-colors"
                    >
                      <Trash2 className="w-3 h-3" /> Limpar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* General Control Options */}
            <div className="mt-4 flex flex-wrap gap-2.5">
              {gameState?.status === "idle" && (
                <button
                  type="button"
                  onClick={becomeDrawer}
                  className="p-3 bg-red-600 hover:bg-black text-white font-black italic shadow-[3px_3px_0px_0px_#000] border-2 border-black uppercase text-xs flex items-center justify-center gap-2 grow select-none active:translate-y-0.5 active:shadow-[1px_1px_0_0_#000] transition-all"
                  style={{ clipPath: "polygon(0 3%, 100% 0, 98% 97%, 1% 95%)" }}
                >
                  <Play className="w-4 h-4 text-yellow-300" /> ✏️ QUERO SER O DESENHISTA! INICIAR RODADA 🎨
                </button>
              )}

              {gameState?.status === "drawing" && isMyTurn && (
                <button
                  type="button"
                  onClick={revealAndReset}
                  className="p-2.5 bg-gray-600 hover:bg-black text-white font-black italic shadow-[3px_3px_0px_0px_#000] border-2 border-black uppercase text-[10px] flex items-center justify-center gap-1 grow"
                  style={{ clipPath: "polygon(0 1%, 100% 0, 99% 99%, 1% 100%)" }}
                >
                  🏳️ DESISTIR / PULAR PALAVRA (REVELAR)
                </button>
              )}

              {gameState?.status === "reveal" && (
                <button
                  type="button"
                  onClick={resetToIdle}
                  className="p-3 bg-green-600 hover:bg-black text-white font-black italic shadow-[3px_3px_0px_0px_#000] border-2 border-black uppercase text-xs flex items-center justify-center gap-2 grow"
                  style={{ clipPath: "polygon(1% 0, 99% 2%, 97% 98%, 0 96%)" }}
                >
                  🔄 LIBERAR LOUSA PARA A PRÓXIMA RODADA!
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Guesses & Live Synced Chat Section (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white border-4 border-black p-4 text-black relative flex flex-col h-[480px]"
            style={{
              clipPath: "polygon(0 1%, 100% 0, 99% 98%, 1% 99%)",
              boxShadow: "5px 5px 0px 0px #000"
            }}
          >
            {/* Guess Container Title */}
            <h4 className="text-[10px] font-black tracking-widest text-[#E60012] uppercase mb-2 pb-1.5 border-b border-gray-200 shrink-0 flex items-center gap-1">
              <HelpCircle className="w-4 h-4 shrink-0 text-red-600" /> CONCENTRAÇÃO DE PALPITES
            </h4>

            {/* Chat Box (Recent guesses list) */}
            <div 
              ref={guessContainerRef}
              className="grow overflow-y-auto space-y-1.5 pr-1 py-1 text-[11px]"
            >
              {guesses.length === 0 ? (
                <p className="text-center text-gray-400 font-bold uppercase py-4">Nenhum palpite enviado ainda.</p>
              ) : (
                guesses.map((msg) => {
                  if (msg.userId === "system") {
                    return (
                      <div key={msg.id} className="p-1.5 bg-gray-100 border-l-4 border-black italic leading-tight text-black font-extrabold uppercase">
                        {msg.text}
                      </div>
                    );
                  }

                  return (
                    <div 
                      key={msg.id} 
                      className={`p-1.5 border leading-tight ${
                        msg.isCorrect 
                          ? "bg-green-100 border-green-500 font-black text-green-700 text-center uppercase" 
                          : "bg-gray-50 border-gray-200"
                      }`}
                    >
                      <div className="flex justify-between items-center mb-0.5">
                        <span className={`font-black uppercase truncate max-w-[120px] ${msg.isCorrect ? "text-green-700" : "text-black"}`}>
                          {msg.sender}
                        </span>
                        <span className="font-mono text-[8px] text-gray-400">{msg.timeStr}</span>
                      </div>
                      <p className={`break-words ${msg.isCorrect ? "font-black" : "text-gray-600"}`}>
                        {msg.text}
                      </p>
                    </div>
                  );
                })
              )}
            </div>

            {/* Guess submission input form */}
            <form onSubmit={submitGuess} className="mt-3 border-t border-gray-200 pt-2.5 shrink-0">
              <fieldset 
                disabled={!gameState || gameState.status !== "drawing" || isMyTurn}
                className="space-y-2 disabled:opacity-40"
              >
                <div className="relative">
                  <input
                    type="text"
                    value={localGuess}
                    onChange={(e) => setLocalGuess(e.target.value)}
                    placeholder={
                      isMyTurn 
                        ? "Você é o desenhista!" 
                        : gameState?.status !== "drawing" 
                          ? "Aguarde início da partida" 
                          : "Escreva seu palpite..."
                    }
                    className="w-full pl-3 pr-8 py-2 border-2 border-black font-medium text-xs text-black placeholder-gray-400 outline-none focus:border-red-600 transition-colors bg-white rounded-none"
                  />
                  <button
                    type="submit"
                    className="absolute right-1 top-1 bottom-1 px-1.5 bg-black hover:bg-red-600 text-white shrink-0 flex items-center justify-center border border-black focus:outline-none transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
                {!isMyTurn && gameState?.status === "drawing" && (
                  <span className="text-[7.5px] font-black text-gray-400 uppercase tracking-tight block text-center select-none">
                    Chutes incorretos aparecem acima. Chute certo pontua!
                  </span>
                )}
              </fieldset>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
