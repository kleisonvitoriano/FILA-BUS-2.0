import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  sendPasswordResetEmail
} from "firebase/auth";
import { 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  where, 
  addDoc, 
  writeBatch, 
  serverTimestamp 
} from "firebase/firestore";
import { 
  Ticket, 
  Sparkles, 
  LogOut, 
  Clock, 
  User, 
  ChevronLeft, 
  ShieldAlert, 
  CheckCircle2, 
  MessageSquare,
  ChevronDown,
  ChevronUp,
  X,
  AlertCircle,
  Layers,
  Megaphone,
  Users,
  Gamepad2
} from "lucide-react";

import { auth, db, handleFirestoreError, OperationType, onQuotaError } from "./firebase";
import { UserProfile, Queue, QueueMember, ChatMessage } from "./types";
import { optimizeImage, escapeHTML } from "./utils";

// Custom UI Components
import RansomLogo from "./components/RansomLogo";
import UserAvatar from "./components/UserAvatar";
import AuthScreen from "./components/AuthScreen";
import QueueSelection from "./components/QueueSelection";
import AdminPanel from "./components/AdminPanel";
import ChatSection from "./components/ChatSection";
import ScribbleFila from "./components/ScribbleFila";

const SUPER_ADMIN_UIDS = ["twqMzdcSPVT31cuQJKsE8HKxQBH3", "fezXWTgqXUMCUBUKSBau6Sv4K9n2"];

const compressAndGetBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 500;
        const MAX_HEIGHT = 500;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.5); 
          resolve(dataUrl);
        } else {
          resolve(event.target?.result as string);
        }
      };
      img.onerror = () => reject(new Error("Erro ao processar imagem."));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Erro ao ler imagem."));
    reader.readAsDataURL(file);
  });
};

export default function App() {
  const [authLoading, setAuthLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  
  // App navigation state
  const [selectedQueueId, setSelectedQueueId] = useState<string | null>(null);
  const [queuesList, setQueuesList] = useState<Queue[]>([]);
  const [activeMembers, setActiveMembers] = useState<QueueMember[]>([]);
  const [activeSettings, setActiveSettings] = useState<Queue | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // Mobile Tab navigation state
  const [mobileTab, setMobileTab] = useState<"queues" | "dashboard" | "chat" | "announcements" | "games">("queues");
  const [announcementText, setAnnouncementText] = useState("");
  const [announcementImage, setAnnouncementImage] = useState("");
  const [isCompressingImage, setIsCompressingImage] = useState(false);
  const [isSavingAnnouncement, setIsSavingAnnouncement] = useState(false);

  // Modals / Overlays
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    text: string;
    onConfirm: (() => void) | null;
  }>({ show: false, title: "", text: "", onConfirm: null });

  // Profile Form States
  const [profileName, setProfileName] = useState("");
  const [profileCourse, setProfileCourse] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profilePhoto, setProfilePhoto] = useState("");
  const [activeTheme, setActiveTheme] = useState("theme-rose");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Error / Toast Alerts
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" | null }>({
    message: "",
    type: null
  });

  // Brasília Real-time Clock synchronization
  const [timeState, setTimeState] = useState({
    timeString: "00:00:00",
    hour: 0,
    minute: 0,
    dateStringBRT: ""
  });
  const [isTimeSynced, setIsTimeSynced] = useState(false);
  const baseTimeDelta = useRef<number>(0);

  // Anti-autoclick random position button
  const [randomBtnPos, setRandomBtnPos] = useState({ top: "70%", left: "45%" });
  const [isQueueOpen, setIsQueueOpen] = useState(false);

  // Observation fields
  const [userObservation, setUserObservation] = useState("");
  const [isSavingObservation, setIsSavingObservation] = useState(false);

  // Active unsubscribers for cleanups (vital to avoid firebase permissions loops)
  const unsubMembers = useRef<any>(null);
  const unsubSettings = useRef<any>(null);
  const unsubChat = useRef<any>(null);

  // --- 1. INSTANT START CACHING SYSTEM ---
  useEffect(() => {
    // Register global listener for quota exceeded errors
    onQuotaError(() => {
      setQuotaExceeded(true);
    });

    // Synchronously recover cached profile on first load
    try {
      const cachedProf = localStorage.getItem("cached_profile");
      if (cachedProf) {
        const parsed = JSON.parse(cachedProf);
        setUserProfile(parsed);
      }
      
      const cachedQueues = localStorage.getItem("cached_queues");
      if (cachedQueues) {
        setQueuesList(JSON.parse(cachedQueues));
      }

      const savedTheme = localStorage.getItem("appTheme") || "theme-rose";
      setActiveTheme(savedTheme);
      document.documentElement.className = savedTheme;
    } catch (e) {
      console.warn("Could not retrieve initial cached state", e);
    }
  }, []);

  // Sync caches when objects change
  const cacheUserProfile = (profile: UserProfile | null) => {
    if (profile) {
      localStorage.setItem("cached_profile", JSON.stringify(profile));
    } else {
      localStorage.removeItem("cached_profile");
    }
  };

  const cacheQueuesList = (queues: Queue[]) => {
    localStorage.setItem("cached_queues", JSON.stringify(queues));
  };

  // --- 2. NOTIFICATION ALERTS (TOASTS) ---
  const triggerToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast({ message: "", type: null });
    }, 4000);
  };

  // --- 3. CONFIRMATION DIALOG GATES ---
  const triggerConfirm = (title: string, text: string, onConfirm: () => void) => {
    setConfirmModal({
      show: true,
      title,
      text,
      onConfirm: () => {
        onConfirm();
        setConfirmModal({ show: false, title: "", text: "", onConfirm: null });
      }
    });
  };

  // --- 4. REAL-TIME WORLDTIME CLOCK DELTA (UTC-3 America/Sao_Paulo) ---
  const fetchTimeOffset = async () => {
    const sources = [
      "https://worldtimeapi.org/api/timezone/America/Sao_Paulo",
      "https://timeapi.io/api/Time/current/zone?timeZone=America/Sao_Paulo"
    ];

    for (const src of sources) {
      try {
        const res = await fetch(src, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          const serverDateStr = data.datetime || data.dateTime;
          const serverMs = new Date(serverDateStr).getTime();
          const localMs = Date.now();
          // serverMs = localMs + delta => delta = serverMs - localMs
          baseTimeDelta.current = serverMs - localMs;
          setIsTimeSynced(true);
          return;
        }
      } catch (err) {
        console.warn("Failed time fetch on source: " + src);
      }
    }
    // Local fallback if networking suffers
    baseTimeDelta.current = 0;
    setIsTimeSynced(false);
  };

  useEffect(() => {
    fetchTimeOffset();
    const syncInterval = setInterval(fetchTimeOffset, 180000); // sync offset every 3 mins

    const clockInterval = setInterval(() => {
      const liveServerTime = new Date(Date.now() + baseTimeDelta.current);
      
      // Calculate Brasília Time (UTC-3) using UTC millisecond offset.
      // This is 100% immune to browser/device 12h/24h setting overrides.
      const brtMs = liveServerTime.getTime() - (3 * 60 * 60 * 1000);
      const brtDate = new Date(brtMs);
      
      const hour = brtDate.getUTCHours();
      const minute = brtDate.getUTCMinutes();
      const second = brtDate.getUTCSeconds();
      
      const timeString = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}`;
      
      // Get YYYY-MM-DD in Brasilia Timezone
      const yyyy = brtDate.getUTCFullYear();
      const mm = String(brtDate.getUTCMonth() + 1).padStart(2, "0");
      const dd = String(brtDate.getUTCDate()).padStart(2, "0");
      const dateStringBRT = `${yyyy}-${mm}-${dd}`;

      setTimeState({
        timeString,
        hour,
        minute,
        dateStringBRT
      });
    }, 1000);

    return () => {
      clearInterval(syncInterval);
      clearInterval(clockInterval);
    };
  }, []);

  // --- 5. DETECT AUTOMATIC RESET OF DAILY QUEUE ---
  const checkForDailyReset = async (queueId: string, settings: Queue, userRole?: string) => {
    if (!settings || !timeState.dateStringBRT) return;
    try {
      if (settings.lastResetDate !== timeState.dateStringBRT) {
        // Daily reset of queue entries on new day
        const membersSnapshot = await getDocs(collection(db, "queues", queueId, "members"));
        const batch = writeBatch(db);
        membersSnapshot.docs.forEach(docSnap => batch.delete(docSnap.ref));
        batch.update(doc(db, "queues", queueId), { lastResetDate: timeState.dateStringBRT });
        await batch.commit();

        await addDoc(collection(db, "queues", queueId, "chat"), {
          text: "Fila reiniciada para o novo dia!",
          type: "system",
          timestamp: serverTimestamp()
        });
      }
    } catch (e) {
      console.warn("Failed daily rollover check", e);
    }
  };

  // --- 6. USER STATE & DB SUB GRIDS ---
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        try {
          const userSnap = await getDoc(doc(db, "users", user.uid));
          if (userSnap.exists()) {
            const data = userSnap.data();
            const isAdminEmail = user.email === "kleissonvitoriano@gmail.com";
            const isSuper = SUPER_ADMIN_UIDS.includes(user.uid) || isAdminEmail;
            
            if (isAdminEmail && data.role !== "superadmin") {
              try {
                await updateDoc(doc(db, "users", user.uid), { role: "superadmin" });
                data.role = "superadmin";
              } catch (roleErr) {
                console.error("Failed to silently upgrade admin role in Firestore:", roleErr);
              }
            }

            const prof: UserProfile = {
              uid: user.uid,
              email: user.email || "",
              name: data.name || "",
              course: data.course || "",
              phone: data.phone || "",
              photoUrl: data.photoUrl || "",
              role: isSuper ? "superadmin" : (data.role || "user"),
              joinedQueues: data.joinedQueues || []
            };
            setUserProfile(prof);
            cacheUserProfile(prof);
            
            // Check if there was a last selected queue session saved
            const lastSel = localStorage.getItem("lastQueueId");
            if (lastSel && prof.joinedQueues.includes(lastSel)) {
              handleQueueLaunch(lastSel, prof);
            } else {
              setAuthLoading(false);
            }
          } else {
            // First time registry bootstrap in db
            const isSuper = SUPER_ADMIN_UIDS.includes(user.uid) || user.email === "kleissonvitoriano@gmail.com";
            const data = {
              email: user.email || "",
              role: isSuper ? "superadmin" : "user",
              joinedQueues: [],
              phone: ""
            };
            await setDoc(doc(db, "users", user.uid), data);
            
            const prof: UserProfile = {
              uid: user.uid,
              email: user.email || "",
              role: isSuper ? "superadmin" : "user",
              joinedQueues: [],
              phone: ""
            };
            setUserProfile(prof);
            cacheUserProfile(prof);
            setShowProfileModal(true); // Forces them to specify a name & course on registration
            setAuthLoading(false);
          }
        } catch (err) {
          console.error("Auth initialization database error: ", err);
          if (err instanceof Error && (err.message.toLowerCase().includes("quota exceeded") || err.message.toLowerCase().includes("quota limit") || err.message.toLowerCase().includes("quota metric"))) {
            setQuotaExceeded(true);
          }
          triggerToast("Falha de autenticação com o banco.", "error");
          setAuthLoading(false);
        }
      } else {
        setCurrentUser(null);
        setUserProfile(null);
        cacheUserProfile(null);
        handleSelectionBack(); // Cleans listeners, state
        setAuthLoading(false);
      }
    });

    return () => {
      unsubAuth();
      clearActiveSubscriptions();
    };
  }, []);

  // Subscription cleanser
  const clearActiveSubscriptions = () => {
    if (unsubMembers.current) { unsubMembers.current(); unsubMembers.current = null; }
    if (unsubSettings.current) { unsubSettings.current(); unsubSettings.current = null; }
    if (unsubChat.current) { unsubChat.current(); unsubChat.current = null; }
  };

  // --- 7. LOAD AND MONITOR SPECIFIC ACTIVE QUEUE ---
  const handleQueueLaunch = async (queueId: string, profileCtx = userProfile) => {
    if (!profileCtx) return;
    setAuthLoading(true);
    setSelectedQueueId(queueId);
    localStorage.setItem("lastQueueId", queueId);
    setMobileTab("dashboard");

    try {
      // Fetch queue credentials once to bootstrap
      const snap = await getDoc(doc(db, "queues", queueId));
      if (!snap.exists()) {
        triggerToast("Fila não encontrada ou excluída.", "error");
        handleSelectionBack();
        return;
      }
      
      const qSettings = { id: snap.id, ...snap.data() } as Queue;
      setActiveSettings(qSettings);
      setAnnouncementText(qSettings.announcement || "");
      setAnnouncementImage(qSettings.announcementImage || "");
      await checkForDailyReset(queueId, qSettings, profileCtx?.role);

      clearActiveSubscriptions();

      // Subscription 1: Live Members Grid
      unsubMembers.current = onSnapshot(
        query(collection(db, "queues", queueId, "members"), orderBy("timestamp", "asc")),
        (snapshot) => {
          const membersList = snapshot.docs.map(d => ({ uid: d.id, ...d.data() } as QueueMember));
          setActiveMembers(membersList);
          
          // Pre-populate user observation input from Firebase state
          const me = membersList.find(m => m.uid === profileCtx.uid);
          if (me) {
            setUserObservation(me.observation || "");
          }
        },
        (error) => {
          console.warn("Members subscription error captured", error);
          handleFirestoreError(error, OperationType.GET, `queues/${queueId}/members`);
        }
      );

      // Subscription 2: Queue general setting tweaks (like opening schedules)
      unsubSettings.current = onSnapshot(doc(db, "queues", queueId), (sDoc) => {
        if (sDoc.exists()) {
          const qData = { id: sDoc.id, ...sDoc.data() } as Queue;
          setActiveSettings(qData);
          setAnnouncementText(qData.announcement || "");
          setAnnouncementImage(qData.announcementImage || "");
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `queues/${queueId}`);
      });

      // Subscription 3: Active Feed Chat (Limit to 60 for performance and minimal battery)
      unsubChat.current = onSnapshot(
        query(collection(db, "queues", queueId, "chat"), orderBy("timestamp", "desc"), limit(60)),
        (sChat) => {
          const messages = sChat.docs.map(docD => ({ id: docD.id, ...docD.data() } as ChatMessage)).reverse();
          setChatMessages(messages);
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, `queues/${queueId}/chat`);
        }
      );

    } catch (e) {
      console.error(e);
      triggerToast("Ocorreu um erro ao sintonizar na fila.", "error");
    } finally {
      setAuthLoading(false);
    }
  };

  // Refresh lists of joined queues
  useEffect(() => {
    if (userProfile && !selectedQueueId) {
      const loadJoinedQueues = async () => {
        try {
          const loaded: Queue[] = [];
          for (const qId of userProfile.joinedQueues) {
            const qSnap = await getDoc(doc(db, "queues", qId));
            if (qSnap.exists()) {
              loaded.push({ id: qSnap.id, ...qSnap.data() } as Queue);
            }
          }
          setQueuesList(loaded);
          cacheQueuesList(loaded);
        } catch (e) {
          console.error("Could not fetch user queues list", e);
          if (e instanceof Error && (e.message.toLowerCase().includes("quota exceeded") || e.message.toLowerCase().includes("quota limit") || e.message.toLowerCase().includes("quota metric"))) {
            setQuotaExceeded(true);
          }
        }
      };
      loadJoinedQueues();
    }
  }, [userProfile, selectedQueueId]);

  // Evaluate if queue open times match Brasília Clock current time
  useEffect(() => {
    if (!timeState.dateStringBRT) {
      setIsQueueOpen(false);
      return;
    }

    if (!activeSettings) {
      setIsQueueOpen(false);
      return;
    }

    const { openTime, closeTime } = activeSettings;
    if (!openTime || !closeTime) {
      setIsQueueOpen(false);
      return;
    }

    const currentMinutes = timeState.hour * 60 + timeState.minute;
    const [oh, om] = openTime.split(":").map(Number);
    const [ch, cm] = closeTime.split(":").map(Number);
    const openMinutes = oh * 60 + om;
    const closeMinutes = ch * 60 + cm;

    const isOpen = currentMinutes >= openMinutes && currentMinutes < closeMinutes;
    setIsQueueOpen(isOpen);

    // Dynamic anti-autoclick button teleportation upon state shift to open
    if (isOpen) {
      const userInQueue = activeMembers.some(m => m.uid === currentUser?.uid);
      if (!userInQueue) {
        randomizeJoinButton();
      }
    }
  }, [timeState.hour, timeState.minute, activeSettings, activeMembers, currentUser]);

  const randomizeJoinButton = () => {
    const rx = Math.floor(Math.random() * 55) + 10; // 10% to 65% width bounds
    const ry = Math.floor(Math.random() * 30) + 40; // 40% to 70% height bounds
    setRandomBtnPos({ top: `${ry}%`, left: `${rx}%` });
  };

  // --- 8. ACTION HANDLERS ---
  const handleLogin = async (email: string, pass: string) => {
    setAuthLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), pass);
      triggerToast("Login efetuado com sucesso!", "success");
    } catch (e) {
      triggerToast("E-mail ou senha incorretos.", "error");
      setAuthLoading(false);
    }
  };

  const handleRegister = async (email: string, pass: string, phone: string) => {
    setAuthLoading(true);
    try {
      setProfilePhone(phone);
      await createUserWithEmailAndPassword(auth, email.trim(), pass);
      triggerToast("Conta criada! Complete seu perfil.", "success");
    } catch (e) {
      triggerToast("Erro ao registrar conta ou e-mail já em uso.", "error");
      setAuthLoading(false);
    }
  };

  const handleForgotPassword = async (email: string) => {
    setAuthLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      triggerToast("E-mail de recuperação enviado!", "success");
    } catch (e: any) {
      console.error("Forgot password error: ", e);
      let errMsg = "Erro ao enviar e-mail de recuperação.";
      if (e.code === "auth/user-not-found") {
        errMsg = "E-mail não cadastrado.";
      } else if (e.code === "auth/invalid-email") {
        errMsg = "E-mail inválido.";
      }
      triggerToast(errMsg, "error");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    triggerConfirm("Sair", "Deseja realmente desconectar de sua conta?", async () => {
      setAuthLoading(true);
      try {
        localStorage.removeItem("lastQueueId");
        await signOut(auth);
        triggerToast("Até logo!", "success");
      } catch (e) {
        triggerToast("Erro ao sair.", "error");
        setAuthLoading(false);
      }
    });
  };

  const handleSelectionBack = () => {
    localStorage.removeItem("lastQueueId");
    clearActiveSubscriptions();
    setSelectedQueueId(null);
    setActiveSettings(null);
    setActiveMembers([]);
    setChatMessages([]);
  };

  // Join a new queue by access code
  const handleJoinByCode = async (code: string) => {
    if (!userProfile || !currentUser) return;
    try {
      const qRef = collection(db, "queues");
      const qQuery = query(qRef, where("code", "==", code.toUpperCase()));
      const snap = await getDocs(qQuery);
      
      if (snap.empty) {
        triggerToast("Fila não encontrada. Verifique o código.", "error");
        throw new Error("Invalid Code");
      }

      const qDoc = snap.docs[0];
      const qId = qDoc.id;
      
      const currentList = [...(userProfile.joinedQueues || [])];
      if (currentList.includes(qId)) {
        triggerToast("Você já possui esta fila vinculada!", "info");
        return;
      }

      currentList.push(qId);
      await updateDoc(doc(db, "users", currentUser.uid), { joinedQueues: currentList });
      
      const updatedProf = { ...userProfile, joinedQueues: currentList };
      setUserProfile(updatedProf);
      cacheUserProfile(updatedProf);
      triggerToast("Fila vinculada com sucesso!", "success");
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  // Admin utility: Create new queue instantly
  const handleCreateNewQueue = async (name: string, code: string) => {
    if (!currentUser || !userProfile) return;
    try {
      const cleanName = name.trim().toUpperCase();
      const cleanCode = code.trim().toUpperCase();

      // Check if code exists
      const checkq = query(collection(db, "queues"), where("code", "==", cleanCode));
      const doubleCheck = await getDocs(checkq);
      if (!doubleCheck.empty) {
        triggerToast("Este código de fila já está em uso!", "error");
        return;
      }

      const newQ = {
        name: cleanName,
        code: cleanCode,
        openTime: "08:00",
        closeTime: "18:00",
        lastResetDate: timeState.dateStringBRT
      };

      const docAdded = await addDoc(collection(db, "queues"), newQ);
      
      // Auto register admin to newly created queue
      const currentList = [...(userProfile.joinedQueues || [])];
      currentList.push(docAdded.id);
      await updateDoc(doc(db, "users", currentUser.uid), { joinedQueues: currentList });

      // Update state
      const updatedProf = { ...userProfile, joinedQueues: currentList };
      setUserProfile(updatedProf);
      cacheUserProfile(updatedProf);
      triggerToast("Fila criada com sucesso!", "success");

      // Auto join
      handleQueueLaunch(docAdded.id, updatedProf);
    } catch (e) {
      console.error("Queue build error: ", e);
      triggerToast("Erro ao inicializar a fila.", "error");
    }
  };

  // Action: User enters active queue
  const handleQueueClickEntrance = async () => {
    if (!currentUser || !userProfile || !selectedQueueId || !activeSettings) return;
    if (!isQueueOpen) {
      triggerToast("A fila está fechada no momento!", "error");
      return;
    }

    try {
      setAuthLoading(true);
      const memberDraft = {
        name: userProfile.name || "Sem Nome",
        course: userProfile.course || "Não Especificado",
        photoUrl: userProfile.photoUrl || "",
        observation: "",
        timestamp: serverTimestamp() // Safe Server-side temporal anchor
      };

      await setDoc(doc(db, "queues", selectedQueueId, "members", currentUser.uid), memberDraft);

      // System notification message to thread
      const now = new Date();
      const entryTimeStr = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

      await addDoc(collection(db, "queues", selectedQueueId, "chat"), {
        text: `${userProfile.name} entrou na fila! (Entrada registrada às ${entryTimeStr})`,
        type: "system",
        timestamp: serverTimestamp()
      });

      triggerToast(`Você entrou na fila às ${entryTimeStr}!`, "success");
    } catch (e) {
      console.error(e);
      triggerToast("Erro ao registrar entrada na fila.", "error");
    } finally {
      setAuthLoading(false);
    }
  };

  // Action: Leave active queue
  const handleQueueExit = () => {
    if (!currentUser || !selectedQueueId || !userProfile) return;
    triggerConfirm("Sair da Fila", "Deseja realmente sair da fila e perder sua posição?", async () => {
      setAuthLoading(true);
      try {
        const memberRef = doc(db, "queues", selectedQueueId, "members", currentUser.uid);
        const memberSnap = await getDoc(memberRef);
        let entryTimeStr = "";
        
        if (memberSnap.exists()) {
          const mData = memberSnap.data();
          if (mData.timestamp) {
            const dt = mData.timestamp.toDate ? mData.timestamp.toDate() : new Date(mData.timestamp);
            entryTimeStr = dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
          }
        }
        
        if (!entryTimeStr) {
          entryTimeStr = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
        }

        await deleteDoc(memberRef);
        
        await addDoc(collection(db, "queues", selectedQueueId, "chat"), {
          text: `${userProfile.name} saiu da fila. (Entrou às ${entryTimeStr})`,
          type: "system",
          timestamp: serverTimestamp()
        });

        triggerToast("Você saiu da fila.", "info");
      } catch (e) {
        triggerToast("Falha ao retirar da fila.", "error");
      } finally {
        setAuthLoading(false);
      }
    });
  };

  // Chat message sender
  const handleSendChatMessage = async (text: string) => {
    if (!currentUser || !selectedQueueId || !userProfile) return;
    try {
      await addDoc(collection(db, "queues", selectedQueueId, "chat"), {
        text: text.trim(),
        type: "user",
        sender: userProfile.name || "Passageiro",
        photoUrl: userProfile.photoUrl || "",
        userId: currentUser.uid,
        timestamp: serverTimestamp()
      });
    } catch (e) {
      triggerToast("Erro ao transmitir mensagem.", "error");
    }
  };

  // Clear chat logs (for superadmins)
  const handleClearChatMessageHistory = async () => {
    if (!currentUser || !selectedQueueId || userProfile?.role !== "superadmin") return;
    triggerConfirm("Limpar Chat", "Deseja realmente limpar todas as mensagens deste chat?", async () => {
      setAuthLoading(true);
      try {
        const messagesSnapshot = await getDocs(collection(db, "queues", selectedQueueId, "chat"));
        const batch = writeBatch(db);
        messagesSnapshot.docs.forEach(docSnap => batch.delete(docSnap.ref));
        await batch.commit();

        await addDoc(collection(db, "queues", selectedQueueId, "chat"), {
          text: "O histórico do chat foi limpo pelo administrador.",
          type: "system",
          timestamp: serverTimestamp()
        });

        triggerToast("Chat limpo com sucesso!", "success");
      } catch (e) {
        console.error("Error clearing chat: ", e);
        triggerToast("Erro ao limpar chat.", "error");
      } finally {
        setAuthLoading(false);
      }
    });
  };

  // Profile update submission (including live queue synchronization)
  const handleSaveProfileChanges = async () => {
    if (!currentUser || !profileName.trim() || !profileCourse.trim()) {
      triggerToast("Preencha seu Nome e Curso!", "error");
      return;
    }
    setIsSavingProfile(true);

    try {
      // Create fallback initial avatar if no image uploaded
      const initial = profileName.trim().charAt(0).toUpperCase();
      const themeColors: { [key: string]: string } = {
        "theme-indigo": "6366f1",
        "theme-emerald": "10b981",
        "theme-rose": "f43f5e",
        "theme-amber": "f59e0b"
      };
      const themeHex = themeColors[activeTheme] || "dc2626";
      const finalPhoto = profilePhoto || `https://placehold.co/200x200/${themeHex}/ffffff?text=${initial}`;

      const updatedFields = {
        name: profileName.trim(),
        course: profileCourse.trim(),
        phone: profilePhone.trim(),
        photoUrl: finalPhoto
      };

      // 1. Update Core user db
      await updateDoc(doc(db, "users", currentUser.uid), updatedFields);

      // 2. Synchronize visual queue card if currently in queue
      if (selectedQueueId) {
        const memberRef = doc(db, "queues", selectedQueueId, "members", currentUser.uid);
        const mSnap = await getDoc(memberRef);
        if (mSnap.exists()) {
          await updateDoc(memberRef, {
            name: updatedFields.name,
            course: updatedFields.course,
            photoUrl: updatedFields.photoUrl
          });
        }
      }

      // 3. Update active React settings state
      const prof = {
        ...userProfile,
        ...updatedFields,
        joinedQueues: userProfile?.joinedQueues || []
      } as UserProfile;
      
      setUserProfile(prof);
      cacheUserProfile(prof);

      // Save Theme Choice locally
      localStorage.setItem("appTheme", activeTheme);
      document.documentElement.className = activeTheme;

      triggerToast("Perfil atualizado!", "success");
      setShowProfileModal(false);
    } catch (e) {
      console.error(e);
      triggerToast("Erro ao processar as edições.", "error");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Downscale and read profile picture file
  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await optimizeImage(file, 256); // Compresses client-side to maximum 256px resolution JPEG
      setProfilePhoto(dataUrl);
    } catch (err) {
      triggerToast("Erro ao codificar imagem. Tente uma menor.", "error");
    }
  };

  // Observation submission
  const handleSaveObservation = async () => {
    if (!currentUser || !selectedQueueId) return;
    setIsSavingObservation(true);
    try {
      await updateDoc(doc(db, "queues", selectedQueueId, "members", currentUser.uid), {
        observation: userObservation.trim()
      });
      triggerToast("Observação atualizada!", "success");
    } catch (e) {
      triggerToast("Falha ao salvar observação.", "error");
    } finally {
      setIsSavingObservation(false);
    }
  };

  // --- 9. ADMIN ACTION METHODS ---
  const handleAdminSaveSchedule = async (open: string, close: string) => {
    if (!selectedQueueId) return;
    try {
      await updateDoc(doc(db, "queues", selectedQueueId), {
        openTime: open,
        closeTime: close
      });
      triggerToast("Schedules atualizados com sucesso!", "success");
    } catch (err) {
      triggerToast("Erro de permissão no admin.", "error");
    }
  };

  const handleAdminResetQueue = async () => {
    if (!selectedQueueId) return;
    triggerConfirm("Limpar Fila", "Deletar todas as inscrições atuais da fila?", async () => {
      setAuthLoading(true);
      try {
        const batch = writeBatch(db);
        const snaps = await getDocs(collection(db, "queues", selectedQueueId, "members"));
        
        const membersInfo: string[] = [];
        snaps.docs.forEach(d => {
          const data = d.data();
          let entryTimeStr = "N/D";
          if (data.timestamp) {
            const dt = data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
            entryTimeStr = dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
          }
          membersInfo.push(`${data.name || "Sem Nome"} (Entrou às ${entryTimeStr})`);
          batch.delete(d.ref);
        });
        
        await batch.commit();

        let logText = "Admin zerou as inscrições da fila.";
        if (membersInfo.length > 0) {
          logText += ` Usuários removidos: ${membersInfo.join(", ")}`;
        } else {
          logText += " A fila já estava vazia.";
        }

        await addDoc(collection(db, "queues", selectedQueueId, "chat"), {
          text: logText,
          type: "system",
          timestamp: serverTimestamp()
        });
        
        triggerToast("Fila esvaziada!", "success");
      } catch (err) {
        triggerToast("Erro ao executar limpeza.", "error");
      } finally {
        setAuthLoading(false);
      }
    });
  };

  const handleAdminSwapPosition = async (uidToMove: string, direction: "up" | "down") => {
    if (!selectedQueueId || activeMembers.length < 2) return;
    const index = activeMembers.findIndex(m => m.uid === uidToMove);
    if (index === -1) return;

    let targetSwapIndex = direction === "up" ? index - 1 : index + 1;
    if (targetSwapIndex < 0 || targetSwapIndex >= activeMembers.length) return;

    const currentToMove = activeMembers[index];
    const itemToSwap = activeMembers[targetSwapIndex];

    try {
      const batch = writeBatch(db);
      // Swapping times in chronological sequence transfers target positions instantly
      batch.update(doc(db, "queues", selectedQueueId, "members", currentToMove.uid), { timestamp: itemToSwap.timestamp });
      batch.update(doc(db, "queues", selectedQueueId, "members", itemToSwap.uid), { timestamp: currentToMove.timestamp });
      await batch.commit();

      await addDoc(collection(db, "queues", selectedQueueId, "chat"), {
        text: `Admin moveu ${currentToMove.name} de posição.`,
        type: "system",
        timestamp: serverTimestamp()
      });
    } catch (e) {
      triggerToast("Erro ao reorganizar posições.", "error");
    }
  };

  const handleAdminExpelUser = async (uid: string, name: string) => {
    if (!selectedQueueId) return;
    triggerConfirm("Expulsar Usuário", `Remover ${name} da fila permanentemente?`, async () => {
      try {
        const memberRef = doc(db, "queues", selectedQueueId, "members", uid);
        const memberSnap = await getDoc(memberRef);
        let entryTimeStr = "";
        
        if (memberSnap.exists()) {
          const mData = memberSnap.data();
          if (mData.timestamp) {
            const dt = mData.timestamp.toDate ? mData.timestamp.toDate() : new Date(mData.timestamp);
            entryTimeStr = dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
          }
        }
        
        if (!entryTimeStr) {
          entryTimeStr = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
        }

        await deleteDoc(memberRef);
        
        await addDoc(collection(db, "queues", selectedQueueId, "chat"), {
          text: `Admin removeu ${name} do grid. (Entrou às ${entryTimeStr})`,
          type: "system",
          timestamp: serverTimestamp()
        });
        
        triggerToast("Passageiro removido.", "info");
      } catch (e) {
        triggerToast("Erro de permissão.", "error");
      }
    });
  };

  // Launch edit profile dialog prefilled
  const openProfileViewDialog = () => {
    setProfileName(userProfile?.name || "");
    setProfileCourse(userProfile?.course || "");
    setProfilePhone(userProfile?.phone || "");
    setProfilePhoto(userProfile?.photoUrl || "");
    setShowProfileModal(true);
  };

  const myPositionIndex = activeMembers.findIndex(m => m.uid === currentUser?.uid);
  const isCurrentlyInQueue = myPositionIndex !== -1;

  return (
    <div className="min-h-screen text-white pb-24 relative selection:bg-red-600 selection:text-white">
      {/* QUOTA EXCEEDED GATE */}
      {quotaExceeded && (
        <div className="fixed inset-0 bg-black/95 z-[100] flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-[#111] p-6 border-4 border-red-600 shadow-[8px_8px_0_0_rgba(220,38,38,0.3)] transform -skew-x-1">
            <div className="flex justify-center mb-4 text-red-600 animate-bounce">
              <ShieldAlert size={56} />
            </div>
            <h2 className="text-xl md:text-2xl font-black italic uppercase text-red-600 tracking-wide mb-3">
              LIMITE DE LEITURAS EXCEDIDO
            </h2>
            <p className="text-xs md:text-sm text-gray-300 font-bold uppercase tracking-wider mb-6 leading-relaxed">
              O banco de dados atingiu o limite gratuito de consultas diárias concedido pelo Google Firebase (Spark Plan / 50.000 leituras).
            </p>
            
            <div className="bg-black p-4 border-2 border-dashed border-red-600 text-left mb-6 text-xs uppercase font-mono text-red-500 space-y-2">
              <p>● STATUS: SISTEMA SUSPENSO ATÉ O PRÓXIMO RESET (MEIA-NOITE)</p>
              <p>● PROJETO: FILAONIBUS</p>
              <p>● DB ID: ai-studio-bb824f99-4a0e-48c0-8623-013f7fd7ee9f</p>
            </div>

            <p className="text-[11px] text-gray-400 font-medium mb-6 uppercase">
              Para resolver isso imediatamente, você pode abrir o console do Firebase e ativar o faturamento (plano com tarifas pequenas) ou aguardar a reinicialização automática amanhã.
            </p>

            <a
              href="https://console.firebase.google.com/project/filaonibus/firestore/databases/ai-studio-bb824f99-4a0e-48c0-8623-013f7fd7ee9f/data?openUpgradeDialog=true"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block w-full bg-red-600 hover:bg-red-700 text-white font-black uppercase italic py-3 px-6 border-2 border-black active:scale-95 shadow-[4px_4px_0_0_#fff] transition-all cursor-pointer text-sm tracking-widest text-center"
            >
              🚀 ATIVAR BASE NO GOOGLE (FIREBASE)
            </a>
          </div>
        </div>
      )}

      {/* 10. LOADING SHELL GATE */}
      {authLoading && (
        <div className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-center gap-4">
          <div className="animate-spin rounded-full h-14 w-14 border-t-4 border-r-4 border-red-600 border-solid" />
          <p className="font-extrabold italic uppercase text-red-600 tracking-wider text-sm select-none">
            CARREGANDO...
          </p>
        </div>
      )}

      {/* Dynamic Alerts Toaster */}
      <AnimatePresence>
        {toast.message && (
          <motion.div
            initial={{ opacity: 0, y: -50, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -50, x: "-50%" }}
            className={`fixed top-5 left-1/2 -translate-x-1/2 p-4 border-4 border-black z-[9999] uppercase font-black italic tracking-wider shadow-solid-black text-sm text-center min-w-[280px] ${
              toast.type === "success" 
                ? "bg-green-500 text-black" 
                : toast.type === "error" 
                ? "bg-red-600 text-white" 
                : "bg-yellow-500 text-black"
            }`}
            style={{
              clipPath: "polygon(0 15%, 100% 0, 97% 100%, 3% 85%)"
            }}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header layout */}
      <header className="w-full max-w-md mx-auto p-4 flex justify-between items-center relative z-20">
        <RansomLogo />

        {userProfile && (
          <div className="flex items-center gap-3">
            {/* Quick edit user profile floating */}
            <button 
              type="button"
              onClick={openProfileViewDialog}
              className="relative focus:scale-105 duration-200"
            >
              <UserAvatar 
                src={userProfile.photoUrl} 
                name={userProfile.name || userProfile.email} 
                size="sm" 
              />
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="bg-white hover:bg-theme text-black hover:text-white font-black uppercase italic px-3 py-1.5 border-2 border-black shadow-[3px_3px_0_0_var(--theme-primary)] transform -skew-x-12 hover:-translate-y-0.5 duration-100 text-xs md:text-sm transition-colors"
            >
              SAIR
            </button>
          </div>
        )}
      </header>

      {/* Main Switch Gate Router */}
      <main className="w-full max-w-sm md:max-w-md mx-auto px-4 mt-4 pb-24">
        <AnimatePresence mode="wait">
          {!currentUser ? (
            <motion.div key="auth" className="w-full">
              <AuthScreen 
                onLogin={handleLogin}
                onRegister={handleRegister}
                onForgotPassword={handleForgotPassword}
                isLoading={authLoading}
              />
            </motion.div>
          ) : (
            <motion.div
              key="authenticated-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {mobileTab === "queues" && (
                <motion.div key="selection" className="w-full" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <QueueSelection
                    queues={queuesList}
                    onSelectQueue={(id) => handleQueueLaunch(id)}
                    onJoinQueueByCode={handleJoinByCode}
                    onCreateQueue={userProfile?.role === "superadmin" ? handleCreateNewQueue : undefined}
                    onLogout={handleLogout}
                    isAdmin={userProfile?.role === "superadmin"}
                    timeString={timeState.timeString}
                    isTimeSynced={isTimeSynced}
                  />
                </motion.div>
              )}

              {mobileTab === "dashboard" && (
                <motion.div key="dashboard-tab" className="space-y-6" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  {selectedQueueId ? (
                    <>
                      {/* Back navigation */}
                      <button
                        type="button"
                        onClick={handleSelectionBack}
                        className="relative z-20 flex items-center gap-1.5 font-black uppercase text-xs italic text-gray-400 hover:text-white mb-6"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        VOLTAR À SELEÇÃO DE FILAS
                      </button>

                      {/* Dynamic Queue Clock Panel */}
                      <section className="relative">
                        <div 
                          className="absolute -top-3.5 -left-1.5 bg-black text-theme text-[9px] font-black p-1 border-2 border-theme uppercase tracking-widest z-10 transform -rotate-2 select-none"
                        >
                          ● HORÁRIO ATUALIZADO
                        </div>
                        <div 
                          className="bg-theme p-4 border-4 border-white shadow-solid-black flex justify-center items-center"
                          style={{
                            clipPath: "polygon(0 8%, 100% 0, 97% 92%, 3% 100%)"
                          }}
                        >
                          <div 
                            className="text-white font-black text-4xl tracking-tighter italic select-none"
                            style={{ textShadow: "3px 3px 0px #000" }}
                          >
                            {timeState.timeString}
                          </div>
                        </div>
                      </section>

                      {/* Grid Statistics Counters */}
                      <section className="grid grid-cols-2 gap-4">
                        {/* User Active Grid Rank */}
                        <div 
                          className="bg-white border-4 border-black p-4 relative flex flex-col justify-between"
                          style={{
                            transform: "rotate(-1.5deg)",
                            boxShadow: "4px 4px 0px 0px var(--theme-primary)"
                          }}
                        >
                          <div className="absolute top-0 right-0 bg-black text-white text-[9px] font-black px-2 py-0.5 uppercase tracking-tighter">
                            SUA POSIÇÃO
                          </div>
                          <div className="text-black font-black text-5xl italic mt-3 text-center leading-none select-none">
                            {isCurrentlyInQueue ? myPositionIndex + 1 : "-"}
                          </div>
                        </div>

                        {/* Queue Total Load */}
                        <div 
                          className="bg-black border-4 border-theme p-4 relative flex flex-col justify-between"
                          style={{
                            transform: "rotate(1.5deg)"
                          }}
                        >
                          <div className="absolute top-0 left-0 bg-theme text-white text-[9px] font-black px-2 py-0.5 uppercase tracking-tighter">
                            TOTAL NA FILA
                          </div>
                          <div className="text-white font-black text-5xl italic mt-3 text-center leading-none select-none">
                            {activeMembers.length}
                          </div>
                        </div>
                      </section>

                      {/* Opening scheduling alert message */}
                      <div 
                        className={`text-center font-black uppercase italic tracking-wider text-xs border-y-2 py-2 transform -skew-x-12 select-none ${
                          isQueueOpen 
                            ? "text-theme border-theme bg-theme/10" 
                            : "text-gray-400 border-gray-700 bg-gray-900/40"
                        }`}
                      >
                        {activeSettings?.openTime && activeSettings?.closeTime
                          ? isQueueOpen
                            ? `FILA ABERTA! FECHA ÀS ${activeSettings.closeTime}`
                            : `SISTEMA FECHADO // ABRE ÀS ${activeSettings.openTime}`
                          : "AGENDAMENTO DE HORÁRIO INDISPONÍVEL"
                        }
                      </div>

                      {/* Driver Specific Panel */}
                      {userProfile?.role === "driver" && (
                        <div className="bg-black border-4 border-cyan-500 shadow-[4px_4px_0_0_#06b6d4] p-4 text-center">
                          <h3 className="text-sm font-black text-cyan-400 italic uppercase">PAINEL DO MOTORISTA</h3>
                          <p className="text-[10px] text-gray-500 uppercase mt-1">Nenhum evento pendente</p>
                        </div>
                      )}

                      {/* Admin Panel Actions */}
                      {userProfile?.role === "superadmin" && activeSettings && (
                        <AdminPanel
                          openTime={activeSettings.openTime || "08:00"}
                          closeTime={activeSettings.closeTime || "18:00"}
                          onSaveSchedule={handleAdminSaveSchedule}
                          onResetQueue={handleAdminResetQueue}
                          onViewLogs={() => setShowLogsModal(true)}
                        />
                      )}

                      {/* Teleporting Anti-Autoclick Button */}
                      <AnimatePresence>
                        {!isCurrentlyInQueue && isQueueOpen && (
                          <motion.button
                            type="button"
                            onClick={handleQueueClickEntrance}
                            initial={{ scale: 0, rotate: 15 }}
                            animate={{ scale: 1, rotate: -2 }}
                            exit={{ scale: 0, rotate: 10 }}
                            whileTap={{ scale: 0.95 }}
                            className="fixed bg-theme border-4 border-white text-white font-black italic text-2xl md:text-3xl py-4 px-6 md:px-8 shadow-solid-black uppercase group z-40 transition-transform cursor-pointer"
                            style={{
                              top: randomBtnPos.top,
                              left: randomBtnPos.left,
                              transform: "translate(-50%, -50%)",
                              clipPath: "polygon(0 15%, 100% 0, 95% 100%, 5% 85%)"
                            }}
                          >
                             ENTRAR NA FILA
                          </motion.button>
                        )}
                      </AnimatePresence>

                      {/* Queue leaving Button (Visible only when users are already placed) */}
                      {isCurrentlyInQueue && (
                        <button
                          type="button"
                          onClick={handleQueueExit}
                          className="w-full bg-theme text-white font-black text-lg italic py-3 shadow-solid-black border-4 border-black uppercase text-center active:scale-95 transition-colors"
                          style={{
                            clipPath: "polygon(0 3%, 100% 0, 98% 97%, 2% 100%)"
                          }}
                        >
                          SAIR DA FILA
                        </button>
                      )}

                      {/* Observation settings widget */}
                      {isCurrentlyInQueue && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-black border-2 border-theme p-4 shadow-sm"
                        >
                          <label className="block text-[9px] font-black text-theme uppercase tracking-widest mb-1.5 italic">
                            SUA OBSERVAÇÃO NA FILA / RECADOS
                          </label>
                          <div className="flex items-center gap-2">
                            <input 
                              type="text" 
                              value={userObservation}
                              onChange={(e) => setUserObservation(e.target.value)}
                              placeholder="EX: CHEGO EM 10 MIN..." 
                              className="flex-1 bg-white border-2 border-black text-black font-semibold text-xs p-2 focus:border-theme focus:outline-none"
                            />
                            <button 
                              type="button"
                              onClick={handleSaveObservation}
                              disabled={isSavingObservation}
                              className="bg-theme hover:bg-white hover:text-black hover:border-black border-2 border-theme text-white font-black text-xs px-4 py-2 transition-colors disabled:opacity-50"
                            >
                              {isSavingObservation ? "AGUARDE..." : "SALVAR"}
                            </button>
                          </div>
                        </motion.div>
                      )}

                      {/* LIVE PLAYERS GRID */}
                      <section className="space-y-4">
                        <h3 className="font-black italic text-lg text-white select-none uppercase tracking-wide">
                          PASSAGEIROS NA FILA ({activeMembers.length})
                        </h3>

                        <div className="space-y-3">
                          {activeMembers.length === 0 ? (
                            <div className="text-center py-10 bg-gray-900/30 border-2 border-dashed border-gray-800 text-gray-500 font-extrabold italic select-none">
                              A FILA ESTÁ VAZIA NO MOMENTO
                            </div>
                          ) : (
                            activeMembers.map((member, i) => {
                              const isMe = member.uid === currentUser?.uid;
                              const displayRank = i + 1;
                              
                              let memberEntryTimeStr = "GRAVANDO...";
                              if (member.timestamp) {
                                const dt = member.timestamp.toDate ? member.timestamp.toDate() : new Date(member.timestamp);
                                memberEntryTimeStr = dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
                              }
                              
                              return (
                                <motion.div
                                  key={member.uid}
                                  layout
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  className={`bg-white text-black p-3.5 border-4 border-black relative flex items-center justify-between ${
                                    isMe ? "bg-theme/5 border-theme" : ""
                                  }`}
                                  style={{
                                    boxShadow: isMe ? "4px 4px 0px 0px var(--theme-primary)" : "3px 3px 0px 0px #000",
                                    transform: `rotate(${i % 2 === 0 ? -1 : 1}deg)`,
                                    clipPath: "polygon(0 3%, 100% 0, 99% 97%, 1% 100%)"
                                  }}
                                >
                                  <div className="flex items-center gap-3 min-w-0 flex-1">
                                    {/* Ranking Box */}
                                    <div className="bg-black text-white w-10 h-10 flex items-center justify-center font-black italic text-lg shrink-0 transform -rotate-3 border-2 border-theme select-none">
                                      {displayRank}
                                    </div>
                                    
                                    {/* Member Avatar */}
                                    <UserAvatar src={member.photoUrl} name={member.name} size="sm" className="shrink-0" />

                                    {/* Credentials */}
                                    <div className="min-w-0 flex-1">
                                      <p className="font-black text-sm uppercase leading-tight truncate select-text">
                                        {escapeHTML(member.name)}
                                      </p>
                                      <p className="text-[10px] text-gray-500 font-black uppercase italic leading-none mt-1 truncate">
                                        {escapeHTML(member.course)}
                                      </p>
                                      
                                      {userProfile?.role === "superadmin" && (
                                        <p className="text-[9.5px] text-yellow-600 font-extrabold uppercase italic leading-none mt-1.5 flex items-center gap-0.5 select-all">
                                          ⏱️ Entrou às {memberEntryTimeStr}
                                        </p>
                                      )}
                                      
                                      {/* Observation label */}
                                      {member.observation && (
                                        <div className="mt-1 flex">
                                          <span className="inline-block bg-black text-white border-l-2 border-theme text-[9px] font-bold px-1.5 py-0.5 max-w-full select-text leading-tight uppercase">
                                            💬 {escapeHTML(member.observation)}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Superadmin controls overlay */}
                                  {userProfile?.role === "superadmin" && !isMe && (
                                    <div className="flex gap-1 items-center shrink-0 ml-2">
                                      {i > 0 && (
                                        <button
                                          type="button"
                                          onClick={() => handleAdminSwapPosition(member.uid, "up")}
                                          className="bg-black text-white hover:bg-yellow-500 hover:text-black w-8 h-8 flex items-center justify-center font-black border-2 border-black text-xs active:scale-90 duration-700"
                                        >
                                          ▲
                                        </button>
                                      )}
                                      {i < activeMembers.length - 1 && (
                                        <button
                                          type="button"
                                          onClick={() => handleAdminSwapPosition(member.uid, "down")}
                                          className="bg-black text-white hover:bg-yellow-500 hover:text-black w-8 h-8 flex items-center justify-center font-black border-2 border-black text-xs active:scale-90"
                                        >
                                          ▼
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => handleAdminExpelUser(member.uid, member.name)}
                                        className="bg-theme text-white hover:bg-black hover:text-theme w-8 h-8 flex items-center justify-center font-black border-2 border-black text-xs active:scale-90 transition-colors"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  )}
                                </motion.div>
                              );
                            })
                          )}
                        </div>
                      </section>
                    </>
                  ) : (
                    <div className="bg-black border-4 border-white p-6 relative text-center text-white" style={{ boxShadow: "6px 6px 0px 0px var(--theme-primary)" }}>
                      <h3 className="font-black italic text-lg tracking-wider mb-2">NENHUMA FILA SELECIONADA</h3>
                      <p className="text-xs text-gray-400 uppercase font-bold leading-normal">Escolha uma fila ativa ou entre por código na aba <span className="text-theme font-black">FILAS</span> para ativar o painel de bordo!</p>
                    </div>
                  )}
                </motion.div>
              )}

              {mobileTab === "chat" && (
                <motion.div key="chat-tab" className="w-full" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  {selectedQueueId ? (
                    <ChatSection
                      messages={chatMessages}
                      currentUserId={currentUser.uid}
                      onSendMessage={handleSendChatMessage}
                      isAdmin={userProfile?.role === "superadmin"}
                      onClearChat={handleClearChatMessageHistory}
                    />
                  ) : (
                    <div className="bg-black border-4 border-white p-6 relative text-center text-white" style={{ boxShadow: "6px 6px 0px 0px var(--theme-primary)" }}>
                      <h3 className="font-black italic text-lg tracking-wider mb-2">CHAT BLOQUEADO</h3>
                      <p className="text-xs text-gray-400 uppercase font-bold leading-normal">Por favor, acesse a aba <span className="text-theme font-black">FILAS</span> e escolha uma fila para ingressar na conversa em tempo real.</p>
                    </div>
                  )}
                </motion.div>
              )}

              {mobileTab === "announcements" && (
                <motion.div key="announcements-tab" className="w-full space-y-6" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  {selectedQueueId ? (
                    <>
                      {userProfile?.role === "superadmin" && (
                        <div className="bg-black border-4 border-yellow-500 shadow-[6px_6px_0_0_#eab308] p-4 relative mb-6">
                          <div className="absolute -top-3.5 left-4 bg-yellow-500 text-black px-3 py-0.5 text-xs font-black uppercase italic border-2 border-black z-10">
                            EDITAR MURAL DE AVISOS DO ADMIN
                          </div>
                          <p className="text-[10px] text-gray-400 italic mb-2 mt-2 uppercase font-bold">Escreva o recado geral para todos os passageiros conectados a esta fila:</p>
                          <textarea
                            value={announcementText}
                            onChange={(e) => setAnnouncementText(e.target.value)}
                            placeholder="EX: ÔNIBUS CHEGANDO NO ESTACIONAMENTO EM 5 MINUTOS..."
                            maxLength={250}
                            rows={3}
                            className="w-full bg-white text-black font-bold uppercase p-2 border-2 border-black focus:outline-none focus:border-theme text-xs"
                          />

                          {/* File upload zone for Announcement image */}
                          <div className="mt-3">
                            <label className="text-[10px] text-gray-400 italic mb-1 uppercase font-bold block">
                              ANEXAR IMAGEM AO AVISO (OPCIONAL):
                            </label>
                            {announcementImage ? (
                              <div className="relative border-2 border-dashed border-yellow-500 p-2 bg-gray-900">
                                <img src={announcementImage} alt="Anexo Preview" className="max-h-32 mx-auto object-contain border-2 border-black bg-black" />
                                <button
                                  type="button"
                                  onClick={() => setAnnouncementImage("")}
                                  className="absolute top-1 right-1 bg-red-600 text-white text-[10px] uppercase font-black px-1.5 py-0.5 border border-black shadow-[1px_1px_0_0_#000000]"
                                >
                                  REMOVER
                                </button>
                              </div>
                            ) : (
                              <label className="border-2 border-dashed border-gray-700 hover:border-yellow-500 cursor-pointer flex flex-col items-center justify-center py-4 bg-gray-900/60 transition-colors">
                                <span className="text-[10px] text-gray-400 uppercase font-black italic">
                                  {isCompressingImage ? "PROCESSANDO..." : "CLIQUE OU SOLTE IMAGEM AQUI"}
                                </span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  disabled={isCompressingImage}
                                  className="hidden"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      setIsCompressingImage(true);
                                      try {
                                        const base64 = await compressAndGetBase64(file);
                                        setAnnouncementImage(base64);
                                        triggerToast("Imagem anexada com sucesso!", "success");
                                      } catch (err: any) {
                                        triggerToast(err.message, "error");
                                      } finally {
                                        setIsCompressingImage(false);
                                      }
                                    }
                                  }}
                                />
                              </label>
                            )}
                          </div>

                          <div className="flex gap-2 mt-4">
                            <button
                              type="button"
                              onClick={async () => {
                                if (!selectedQueueId) return;
                                setIsSavingAnnouncement(true);
                                try {
                                  await updateDoc(doc(db, "queues", selectedQueueId), {
                                    announcement: announcementText.trim(),
                                    announcementImage: announcementImage || ""
                                  });
                                  triggerToast("Aviso publicado com sucesso!", "success");
                                } catch (err) {
                                  triggerToast("Sem permissão para atualizar avisos.", "error");
                                } finally {
                                  setIsSavingAnnouncement(false);
                                }
                              }}
                              disabled={isSavingAnnouncement || isCompressingImage}
                              className="flex-1 bg-yellow-500 hover:bg-white text-black font-black italic uppercase py-2 border-2 border-black text-xs shadow-[2px_2px_0_0_#000000]"
                            >
                              {isSavingAnnouncement ? "PUBLICANDO..." : "PUBLICAR EVENTO"}
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                if (!selectedQueueId) return;
                                setIsSavingAnnouncement(true);
                                try {
                                  await updateDoc(doc(db, "queues", selectedQueueId), {
                                    announcement: "",
                                    announcementImage: ""
                                  });
                                  setAnnouncementText("");
                                  setAnnouncementImage("");
                                  triggerToast("Mural de avisos limpo!", "info");
                                } catch (err) {
                                  console.error(err);
                                } finally {
                                  setIsSavingAnnouncement(false);
                                }
                              }}
                              className="bg-red-600 hover:bg-black text-white px-4 py-2 border-2 border-black text-xs font-black italic uppercase"
                            >
                              LIMPAR
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Read-only segment showing active notices without title clipping */}
                      <div className="relative mt-8 p-5 pt-8">
                        {/* Visual background wrapper */}
                        <div 
                          className="absolute inset-0 bg-white border-4 border-black shadow-[6px_6px_0px_0px_var(--theme-primary)]"
                          style={{
                            clipPath: "polygon(0 1%, 100% 0, 98% 99%, 1% 97%)",
                            zIndex: 0
                          }}
                        />

                        {/* Title Above Clip Path block */}
                        <div 
                          className="absolute -top-4 right-4 bg-black text-white font-black italic px-4 py-1 text-xs border-2 border-theme uppercase"
                          style={{ transform: "rotate(-1.5deg)", zIndex: 10 }}
                        >
                          MURAL SISTÊMICO DE AVISOS
                        </div>

                        <div className="relative z-10 text-black py-2">
                          {activeSettings?.announcement || activeSettings?.announcementImage ? (
                            <div className="space-y-4">
                              <div className="bg-yellow-100 border-l-4 border-yellow-500 p-2.5 italic font-semibold text-black text-xs md:text-sm select-text whitespace-pre-wrap uppercase leading-relaxed tracking-wider animate-pulse">
                                ⚠️ ATENÇÃO USUÁRIOS DA FILA:
                              </div>
                              
                              {activeSettings.announcement && (
                                <p className="text-black font-black text-sm md:text-base leading-relaxed tracking-wide select-text uppercase italic whitespace-pre-wrap p-3 bg-gray-50 border-2 border-dashed border-black">
                                  {activeSettings.announcement}
                                </p>
                              )}

                              {activeSettings.announcementImage && (
                                <div className="border-4 border-black bg-black p-1 shadow-[3px_3px_0_0_var(--theme-primary)] transform rotate-1 hover:rotate-0 transition-transform max-w-sm mx-auto">
                                  <img 
                                    src={activeSettings.announcementImage} 
                                    alt="Comunicado oficial do organizador" 
                                    className="w-full h-auto object-cover border-2 border-white select-text"
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-center py-10">
                              <div className="text-gray-400 font-extrabold text-sm uppercase italic tracking-wide select-none">
                                NENHUM AVISO IMPORTANTE NO MOMENTO.
                              </div>
                              <p className="text-[10px] text-gray-500 uppercase mt-1">O ADMINISTRADOR AINDA NÃO POSTOU COMUNICADOS NESTA FILA.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="bg-black border-4 border-white p-6 relative text-center text-white" style={{ boxShadow: "6px 6px 0px 0px var(--theme-primary)" }}>
                      <h3 className="font-black italic text-lg tracking-wider mb-2">MURAL DE AVISOS FECHADO</h3>
                      <p className="text-xs text-gray-400 uppercase font-bold leading-normal">Selecione uma fila de transporte na aba <span className="text-theme font-black">FILAS</span> para acessar o mural oficial de atualizações do organizador!</p>
                    </div>
                  )}
                </motion.div>
              )}

              {mobileTab === "games" && (
                <motion.div key="games-tab" className="w-full" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <ScribbleFila queueId={selectedQueueId} userProfile={userProfile} />
                </motion.div>
              )}


            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Mobile Taskbar Navigation */}
      {currentUser && (
        <nav 
          className="fixed bottom-0 left-0 right-0 bg-black border-t-4 border-black z-40 flex justify-around items-center"
          style={{
            boxShadow: "0px -4px 10px rgba(0,0,0,0.4)"
          }}
        >
          {[
            { id: "queues", label: "FILAS", icon: Layers },
            { id: "dashboard", label: "FILA", icon: Users },
            { id: "chat", label: "CHAT", icon: MessageSquare },
            { id: "announcements", label: "AVISOS", icon: Megaphone },
            { id: "games", label: "JOGOS", icon: Gamepad2 }
          ].map((tab) => {
            const isSelected = mobileTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setMobileTab(tab.id as any)}
                className={`flex-1 py-3 px-2 flex flex-col items-center justify-center gap-1 transition-all ${
                  isSelected 
                    ? "bg-theme text-white font-black" 
                    : "text-gray-400 hover:text-white"
                }`}
                style={{
                  clipPath: isSelected 
                    ? "polygon(0 0, 100% 4%, 96% 100%, 4% 96%)" 
                    : "none",
                  transform: isSelected ? "scale(1.05) translateY(-2px)" : "none"
                }}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="text-[10px] font-black tracking-tighter uppercase leading-none">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </nav>
      )}

      {/* --- MODAL DIALOGS --- */}

      {/* Profile settings modal */}
      <AnimatePresence>
        {showProfileModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.9, rotate: -2, opacity: 0 }}
              animate={{ scale: 1, rotate: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white text-black p-6 md:p-8 border-4 border-black w-full max-w-md relative"
              style={{
                boxShadow: "10px 10px 0px 0px var(--theme-primary)",
                clipPath: "polygon(0 3%, 100% 0, 98% 97%, 1% 100%)"
              }}
            >
              <h2 className="text-2xl font-black text-center italic tracking-tight uppercase mb-6" style={{ textShadow: "1px 1px 0px var(--theme-primary)" }}>
                PERFIL DO USUÁRIO
              </h2>

              <div className="space-y-4">
                {/* Photo loader upload widget representing persona styling */}
                <div className="flex flex-col items-center justify-center gap-2 mb-4">
                  <div className="relative group cursor-pointer" onClick={() => document.getElementById("fileUploaderID")?.click()}>
                    <UserAvatar src={profilePhoto} name={profileName || "?"} size="lg" />
                    <div className="absolute inset-0 bg-black/60 rounded-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-white text-[10px] font-black italic">ENVIAR</span>
                    </div>
                  </div>
                  <input 
                    type="file" 
                    id="fileUploaderID"
                    accept="image/*"
                    onChange={handlePhotoFileChange}
                    className="hidden"
                  />
                  <p className="text-[10px] text-gray-500 font-bold uppercase italic mt-1 text-center">
                    COMPRESSÃO ATIVA // TOQUE PARA MUDAR
                  </p>
                </div>

                <div>
                  <label className="block text-black font-black uppercase text-xs mb-1 italic">NOME COMPLETO</label>
                  <input 
                    type="text" 
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="DIGITE SEU NOME" 
                    className="w-full bg-black text-white p-3 font-bold border-2 border-theme focus:bg-white focus:text-black focus:outline-none text-sm uppercase"
                  />
                </div>

                <div>
                  <label className="block text-black font-black uppercase text-xs mb-1 italic">CURSO / SETOR</label>
                  <input 
                    type="text" 
                    value={profileCourse}
                    onChange={(e) => setProfileCourse(e.target.value)}
                    placeholder="EX: ENGENHARIA DE SOFTWARE" 
                    className="w-full bg-black text-white p-3 font-bold border-2 border-theme focus:bg-white focus:text-black focus:outline-none text-sm uppercase"
                  />
                </div>

                <div>
                  <label className="block text-black font-black uppercase text-xs mb-1 italic">CELULAR (OPCIONAL)</label>
                  <input 
                    type="tel" 
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    placeholder="(00) 00000-0000" 
                    className="w-full bg-black text-white p-3 font-bold border-2 border-theme focus:bg-white focus:text-black focus:outline-none text-sm"
                  />
                </div>

                {/* Theme setting toggler */}
                <div className="pt-3 border-t-2 border-dashed border-gray-400">
                  <span className="block text-[10px] font-black text-gray-500 uppercase italic tracking-wider mb-2">
                    TEMA DO SISTEMA
                  </span>
                  <div className="flex gap-2">
                    {["theme-rose", "theme-indigo", "theme-emerald", "theme-amber"].map((thm) => {
                      const colorMap: { [key: string]: string } = {
                        "theme-rose": "bg-red-600",
                        "theme-indigo": "bg-indigo-600",
                        "theme-emerald": "bg-emerald-600",
                        "theme-amber": "bg-amber-500"
                      };
                      return (
                        <button
                          key={thm}
                          type="button"
                          onClick={() => {
                            setActiveTheme(thm);
                            document.documentElement.className = thm;
                            localStorage.setItem("appTheme", thm);
                          }}
                          className={`w-7 h-7 rounded-sm border-2 border-black ${colorMap[thm]} transition-transform ${
                            activeTheme === thm ? "scale-115 rotate-6 shadow-sm" : "opacity-60"
                          }`}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="pt-6 space-y-2 mt-4 border-t-4 border-black">
                <button
                  type="button"
                  onClick={handleSaveProfileChanges}
                  disabled={isSavingProfile}
                  className="w-full bg-theme text-white hover:text-theme font-black text-lg italic py-3 border-2 border-black shadow-[3px_3px_0_0_#000000] hover:bg-black uppercase disabled:opacity-50 transition-colors"
                >
                  {isSavingProfile ? "GRAVANDO..." : "SALVAR ALTERAÇÕES"}
                </button>
                {/* Allow cancel if profile already contains minimal required coordinates */}
                {userProfile?.name && (
                  <button
                    type="button"
                    onClick={() => setShowProfileModal(false)}
                    className="w-full text-center text-gray-400 font-extrabold text-xs uppercase py-2 hover:underline tracking-widest block"
                  >
                    CANCELAR
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Admin Logs / History Modal */}
      <AnimatePresence>
        {showLogsModal && userProfile?.role === "superadmin" && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4">
            <motion.div
              initial={{ scale: 0.9, y: 30, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white text-black p-6 border-4 border-black w-full max-w-md h-[480px] flex flex-col justify-between relative"
              style={{
                boxShadow: "10px 10px 0px 0px #eab308"
              }}
            >
              <div className="flex justify-between items-center border-b-4 border-black pb-3">
                <h3 className="text-xl font-black italic uppercase text-yellow-600">HISTÓRICO DA FILA</h3>
                <button 
                  type="button" 
                  onClick={() => setShowLogsModal(false)}
                  className="text-black hover:text-red-600 p-1"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3.5 my-4 pr-1">
                {chatMessages.filter(m => m.type === "system").length === 0 ? (
                  <div className="text-center py-10 text-gray-400 font-bold italic uppercase">
                    SEM LOGS NO MOMENTO
                  </div>
                ) : (
                  chatMessages.filter(m => m.type === "system").map((log, index) => {
                    let ts = "RECENTE";
                    if (log.timestamp) {
                      const dt = log.timestamp.toDate ? log.timestamp.toDate() : new Date(log.timestamp);
                      ts = dt.toLocaleString("pt-BR");
                    }
                    return (
                      <div key={log.id} className="p-3 bg-gray-100 border-l-4 border-yellow-500 font-semibold text-xs text-slate-800">
                        <p className="font-extrabold text-[10px] text-yellow-600 mb-1">{ts}</p>
                        <p className="break-words select-text">{escapeHTML(log.text)}</p>
                      </div>
                    );
                  })
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowLogsModal(false)}
                className="w-full bg-black text-white font-black italic uppercase py-3 border-2 border-black"
              >
                FECHAR HISTÓRICO
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Alerts Dialog overlay */}
      <AnimatePresence>
        {confirmModal.show && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/95 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white text-black p-6 border-4 border-black w-full max-w-sm text-center"
              style={{
                boxShadow: "6px 6px 0px 0px #dc2626"
              }}
            >
              <AlertCircle className="w-10 h-10 text-red-600 mx-auto mb-2" />
              <h3 className="text-xl font-black uppercase italic text-black">{confirmModal.title}</h3>
              <p className="text-xs font-semibold text-gray-500 uppercase mt-2 mb-4 leading-relaxed tracking-wider">
                {confirmModal.text}
              </p>
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setConfirmModal({ show: false, title: "", text: "", onConfirm: null })}
                  className="bg-black hover:bg-gray-800 text-white font-black italic uppercase py-2.5 border-2 border-black text-xs"
                >
                  CANCELAR
                </button>
                <button
                  type="button"
                  onClick={() => confirmModal.onConfirm?.()}
                  className="bg-red-600 hover:bg-black text-white font-black italic uppercase py-2.5 border-2 border-black text-xs shadow-[2px_2px_0_0_#000000]"
                >
                  CONFIRMAR
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
