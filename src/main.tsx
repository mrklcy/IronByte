import React, { Component, useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import { AnimatePresence, motion } from "framer-motion";
import {
  Award,
  Bell,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Command,
  FileCheck2,
  Flag,
  GraduationCap,
  HardDrive,
  Home,
  KeyRound,
  Layers3,
  Lock,
  Mail,
  MonitorDot,
  Moon,
  MessageSquare,
  Play,
  ServerCog,
  Search,
  Settings,
  Sparkles,
  Star,
  Sun,
  Terminal,
  Trophy,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { Badge, Button, Card, Input, Progress, SectionHeader } from "./components/ui";
import { cn } from "./lib/utils";
import trainHackLogo from "./assets/TrainHack_Logo.png";
import "./index.css";

const API_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:4000/api/v1";
const demoCredentials = { email: "ari@trainhack.local", password: "TrainHack123!" };
const adminCredentials = { email: "", password: "" };

type View = "landing" | "dashboard" | "challenge" | "path" | "machines" | "labs" | "leaderboard" | "certificates" | "community" | "profile" | "settings" | "login" | "signup" | "admin-auth";
type AdminView = "operations" | "users" | "content" | "machines" | "audit";
type AuthMode = "login" | "register";
type Difficulty = "BEGINNER" | "EASY" | "MEDIUM" | "HARD" | "EXPERT";
type ChallengeDifficultyFilter = "All" | "EASY" | "MEDIUM" | "HARD";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
  meta?: { total?: number };
  errors?: unknown[];
};

type User = {
  id: string;
  email: string;
  username: string;
  displayName?: string | null;
  xp: number;
  level: number;
  roles?: UserRole[];
  permissions?: UserPermission[];
};

type UserRole = string | { name?: string; role?: { name?: string } };
type UserPermission = string | { key?: string; permission?: { key?: string } };

type Challenge = {
  slug: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  baseXp: number;
  tags: string[];
  category?: { name: string };
  hints?: { id: string; title: string; penaltyPct: number; content?: string }[];
};

type Course = {
  slug: string;
  title: string;
  summary: string;
  difficulty: Difficulty;
  modules: {
    id: string;
    title: string;
    summary?: string | null;
    lessons: { id: string; title: string; estimatedMinutes: number }[];
  }[];
};

type Lab = {
  id?: string;
  slug: string;
  name: string;
  os: string;
  description: string;
  difficulty: Difficulty;
  timeLimitMinutes: number;
  category?: { name: string };
};

type LabTarget = {
  address: string;
  url: string;
  username: string;
  password: string;
  objective: string;
  flagFormat: string;
  rewardXp: number;
  commands: string[];
  clues: string[];
};

type LabAttempt = {
  id: string;
  status: "STOPPED" | "RUNNING" | "PAUSED" | "EXPIRED";
  startedAt?: string | null;
  expiresAt?: string | null;
  ipAddress?: string | null;
  target?: LabTarget;
  lab: Lab;
};

type LabFlagResult = {
  correct: boolean;
  awardedXp: number;
  completed: boolean;
  alreadyCompleted?: boolean;
  expectedFormat?: string;
};

type Certificate = {
  id: string;
  title: string;
  serial: string;
  issuedAt: string;
};

type NotificationItem = {
  id: string;
  readAt?: string | null;
  notification: {
    title: string;
    body: string;
    createdAt: string;
  };
};

type CommunityPost = {
  id: string;
  createdAt: string;
  metadata?: { message?: string };
  user?: Pick<User, "id" | "username" | "displayName" | "xp" | "level"> | null;
};

type UserSettings = {
  id: string;
  theme: "light" | "dark" | "system";
  emailNotifications: boolean;
  profileVisibility: "public" | "private";
};

type AuthState = {
  user: User | null;
  accessToken: string;
  refreshToken: string;
};

type AppData = {
  challenges: Challenge[];
  courses: Course[];
  labs: Lab[];
  leaderboard: User[];
};

type AdminDashboardData = {
  users: number;
  courses: number;
  labs: number;
  challenges: number;
  submissions: number;
  auditLogs: { id: string; action: string; resource: string; createdAt: string }[];
};

type ProfileAnalytics = {
  solvedTotal: number;
  xpFromSolved: number;
  byCategory: Record<string, number>;
  byDifficulty: Record<string, number>;
  recentSolved: {
    slug: string;
    title: string;
    category: string;
    difficulty: Difficulty;
    awardedXp: number;
    solvedAt: string;
  }[];
};

type AdminUser = User & {
  createdAt?: string;
};

const navItems = [
  ["Dashboard", Home, "dashboard"],
  ["Challenges", Flag, "challenge"],
  ["Learning Paths", Layers3, "path"],
  ["Machines", MonitorDot, "machines"],
  ["Labs", HardDrive, "labs"],
  ["Leaderboard", Trophy, "leaderboard"],
  ["Certificates", Award, "certificates"],
  ["Community", Users, "community"],
  ["Profile", Star, "profile"],
  ["Settings", Settings, "settings"],
] as const;

const challengeCategories = [
  "All",
  "Web Exploitation",
  "Cryptography",
  "Reverse Engineering",
  "Forensics",
  "General Skills",
  "Binary Exploitation",
  "Blockchain",
  "Recoinaisance",
  "Networking",
  "AI",
] as const;

const challengeDifficulties: ChallengeDifficultyFilter[] = ["All", "EASY", "MEDIUM", "HARD"];

function difficultyTone(difficulty?: Difficulty) {
  if (difficulty === "HARD" || difficulty === "EXPERT") return "red";
  if (difficulty === "MEDIUM") return "amber";
  return "green";
}

function isLiveAttempt(attempt?: LabAttempt) {
  if (!attempt || attempt.status !== "RUNNING") return false;
  if (!attempt.expiresAt) return true;
  return new Date(attempt.expiresAt).getTime() > Date.now();
}

function timeLeftLabel(expiresAt?: string | null) {
  if (!expiresAt) return "No expiry";
  const remaining = new Date(expiresAt).getTime() - Date.now();
  if (remaining <= 0) return "Expired";
  const minutes = Math.ceil(remaining / 60000);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours <= 0) return `${mins}m left`;
  return mins ? `${hours}h ${mins}m left` : `${hours}h left`;
}

function shortDateTime(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function roleNames(user?: User | null) {
  return (user?.roles ?? [])
    .map((role) => {
      if (typeof role === "string") return role;
      return role.name ?? role.role?.name ?? "";
    })
    .filter(Boolean);
}

function permissionNames(user?: User | null) {
  return (user?.permissions ?? [])
    .map((permission) => {
      if (typeof permission === "string") return permission;
      return permission.key ?? permission.permission?.key ?? "";
    })
    .filter(Boolean);
}

function hasAdminAccess(user?: User | null) {
  return roleNames(user).includes("ADMINISTRATOR") || permissionNames(user).includes("admin:access");
}

function readStoredAuth(): AuthState {
  const emptyAuth = { user: null, accessToken: "", refreshToken: "" };
  try {
    const stored = localStorage.getItem("trainhack-auth");
    if (!stored) return emptyAuth;
    const parsed = JSON.parse(stored) as Partial<AuthState>;
    return {
      user: parsed.user ?? null,
      accessToken: typeof parsed.accessToken === "string" ? parsed.accessToken : "",
      refreshToken: typeof parsed.refreshToken === "string" ? parsed.refreshToken : "",
    };
  } catch {
    localStorage.removeItem("trainhack-auth");
    return emptyAuth;
  }
}

async function api<T>(path: string, options: RequestInit & { token?: string } = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...options.headers,
    },
  });

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? ((await response.json()) as ApiResponse<T>)
    : ({
        success: false,
        message: await response.text(),
        data: undefined as T,
      } satisfies ApiResponse<T>);

  if (!response.ok || !payload.success) throw new Error(getApiErrorMessage(payload));
  return payload;
}

function getApiErrorMessage(payload: ApiResponse<unknown>) {
  const firstError = payload.errors?.[0];
  if (firstError && typeof firstError === "object" && "path" in firstError && "message" in firstError) {
    const issue = firstError as { path?: unknown[]; message?: string };
    const field = issue.path?.filter((part) => typeof part === "string").at(-1);
    const label = typeof field === "string" ? `${field.charAt(0).toUpperCase()}${field.slice(1)}` : "Input";
    return `${label}: ${issue.message ?? payload.message}`;
  }
  return payload.message || "Request failed.";
}

function useLabSessions(auth: AuthState) {
  const [attempts, setAttempts] = useState<LabAttempt[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionSlug, setActionSlug] = useState("");
  const [flagSlug, setFlagSlug] = useState("");

  async function loadAttempts() {
    if (!auth.accessToken) {
      setAttempts([]);
      return;
    }

    setLoading(true);
    try {
      const payload = await api<LabAttempt[]>("/lab-attempts", { token: auth.accessToken });
      setAttempts(payload.data.filter(isLiveAttempt));
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load lab sessions.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAttempts();
  }, [auth.accessToken]);

  async function toggleLab(lab: Lab) {
    if (!auth.accessToken) {
      setMessage("Log in to start and stop machines.");
      return;
    }

    const running = attempts.find((attempt) => attempt.lab.slug === lab.slug && isLiveAttempt(attempt));
    setActionSlug(lab.slug);
    try {
      if (running) {
        const payload = await api<LabAttempt>(`/lab-attempts/${running.id}/stop`, { method: "POST", token: auth.accessToken });
        setAttempts((current) => current.filter((attempt) => attempt.id !== payload.data.id));
        setMessage(`${lab.name} stopped.`);
      } else {
        const payload = await api<LabAttempt>(`/labs/${lab.slug}/start`, { method: "POST", token: auth.accessToken });
        setAttempts((current) => [payload.data, ...current.filter((attempt) => attempt.lab.slug !== lab.slug)]);
        setMessage(`${lab.name} started. Session expires ${shortDateTime(payload.data.expiresAt)}.`);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Machine action failed.");
    } finally {
      setActionSlug("");
    }
  }

  async function submitLabFlag(lab: Lab, flag: string) {
    if (!auth.accessToken) {
      setMessage("Log in to submit lab flags.");
      return null;
    }

    setFlagSlug(lab.slug);
    try {
      const payload = await api<LabFlagResult>(`/labs/${lab.slug}/flag`, {
        method: "POST",
        token: auth.accessToken,
        body: JSON.stringify({ flag }),
      });
      setMessage(
        payload.data.correct
          ? payload.data.awardedXp
            ? `Correct lab flag. Awarded ${payload.data.awardedXp} XP.`
            : "Correct lab flag. This lab was already completed."
          : `Incorrect lab flag. Expected format: ${payload.data.expectedFormat ?? "TH{...}"}.`,
      );
      if (payload.data.correct) await loadAttempts();
      return payload.data;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Lab flag submission failed.");
      return null;
    } finally {
      setFlagSlug("");
    }
  }

  function runningFor(slug: string) {
    return attempts.find((attempt) => attempt.lab.slug === slug && isLiveAttempt(attempt));
  }

  return { attempts, message, loading, actionSlug, flagSlug, loadAttempts, toggleLab, submitLabFlag, runningFor };
}

function App() {
  const isAdminPort = window.location.port === "5174";
  const [dark, setDark] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedChallenge, setSelectedChallenge] = useState("header-mirage");
  const [data, setData] = useState<AppData>({ challenges: [], courses: [], labs: [], leaderboard: [] });
  const [auth, setAuth] = useState<AuthState>(() => readStoredAuth());
  const [view, setView] = useState<View>(() => {
    if (!isAdminPort) return "landing";
    return readStoredAuth().accessToken ? "dashboard" : "admin-auth";
  });
  const [loading, setLoading] = useState(true);
  const [authChecking, setAuthChecking] = useState(Boolean(isAdminPort && auth.accessToken));
  const [notice, setNotice] = useState("");
  const [notificationCount, setNotificationCount] = useState(0);

  useMemo(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  useEffect(() => {
    localStorage.setItem("trainhack-auth", JSON.stringify(auth));
  }, [auth]);

  useEffect(() => {
    if (isAdminPort) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    Promise.all([
      api<Challenge[]>(`/challenges?search=${encodeURIComponent(search)}`),
      api<Course[]>(`/courses?search=${encodeURIComponent(search)}`),
      api<Lab[]>(`/labs?search=${encodeURIComponent(search)}`),
      api<User[]>("/leaderboard"),
    ])
      .then(([challenges, courses, labs, leaderboard]) => {
        if (!active) return;
        setData({
          challenges: challenges.data,
          courses: courses.data,
          labs: labs.data,
          leaderboard: leaderboard.data,
        });
        setNotice("");
      })
      .catch((error: Error) => active && setNotice(error.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [isAdminPort, search]);

  useEffect(() => {
    if (!auth.accessToken) {
      setAuthChecking(false);
      return;
    }
    setAuthChecking(true);
    api<User>("/users/me", { token: auth.accessToken })
      .then((payload) => {
        setAuth((current) => ({ ...current, user: payload.data }));
        if (isAdminPort) setView("dashboard");
      })
      .catch(() => {
        setAuth({ user: null, accessToken: "", refreshToken: "" });
        if (isAdminPort) setView("admin-auth");
      })
      .finally(() => setAuthChecking(false));
  }, [auth.accessToken, isAdminPort]);

  const challenge = data.challenges.find((item) => item.slug === selectedChallenge) ?? data.challenges[0];
  const isAdmin = hasAdminAccess(auth.user);
  const shouldShowAdminShell = isAdmin || Boolean(isAdminPort && auth.user);

  function openChallenge(slug?: string) {
    if (slug) setSelectedChallenge(slug);
    setView("challenge");
  }

  async function openNotifications() {
    if (!auth.accessToken) {
      setNotice("Log in to view account notifications.");
      return;
    }

    try {
      const payload = await api<NotificationItem[]>("/notifications", { token: auth.accessToken });
      const unread = payload.data.filter((item) => !item.readAt);
      setNotificationCount(unread.length);
      setNotice(unread[0] ? `${unread[0].notification.title}: ${unread[0].notification.body}` : "No new notifications.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to load notifications.");
    }
  }

  function openAuth(mode: AuthMode) {
    setView(mode === "login" ? "login" : "signup");
    setNotice("");
  }

  function openAdminAuth() {
    if (!isAdminPort) {
      window.location.href = "http://localhost:5174/";
      return;
    }
    setView("admin-auth");
    setNotice("");
  }

  async function logout() {
    try {
      if (auth.accessToken) {
        await api<Record<string, never>>("/auth/logout", {
          method: "POST",
          token: auth.accessToken,
          body: JSON.stringify({ refreshToken: auth.refreshToken || undefined }),
        });
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Logout request failed; local session cleared.");
    } finally {
      setAuth({ user: null, accessToken: "", refreshToken: "" });
      localStorage.removeItem("trainhack-auth");
      setView(isAdminPort ? "admin-auth" : "landing");
    }
  }

  const isAuthView = view === "login" || view === "signup" || view === "admin-auth";
  const appView: View = !isAdminPort && auth.user && (isAuthView || view === "landing") ? "dashboard" : view;

  if (isAdminPort) {
    if (auth.accessToken && authChecking) {
      return <AdminCheckingScreen />;
    }

    if (auth.user) {
      return (
        <AdminShell
          auth={auth}
          data={data}
          dark={dark}
          setDark={setDark}
          onLogout={logout}
        />
      );
    }

    return (
      <div className="min-h-screen bg-background text-foreground">
        <AnimatePresence mode="wait">
          <motion.main
            key="admin-auth"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22 }}
            className="grid min-h-screen place-items-center px-4 py-8 sm:px-6 lg:px-8"
          >
            <div className="w-full">
              {notice && <StatusPanel tone="error" message={notice} />}
              <AdminAuthPage auth={auth} setAuth={setAuth} setView={setView} />
            </div>
          </motion.main>
        </AnimatePresence>
      </div>
    );
  }

  if (!isAdminPort && appView === "landing") {
    return (
      <LandingPage
        data={data}
        dark={dark}
        setDark={setDark}
        onAuth={openAuth}
        setView={setView}
      />
    );
  }

  if (shouldShowAdminShell) {
    return (
      <AdminShell
        auth={auth}
        data={data}
        dark={dark}
        setDark={setDark}
        onLogout={logout}
      />
    );
  }

  if (isAuthView && !auth.user) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <AnimatePresence mode="wait">
          <motion.main
            key={view}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22 }}
            className="grid min-h-screen place-items-center px-4 py-8 sm:px-6 lg:px-8"
          >
            <div className="w-full">
              {notice && <StatusPanel tone="error" message={notice} />}
              {view === "login" && <AuthPage mode="login" auth={auth} setAuth={setAuth} setView={setView} onAdminAuth={openAdminAuth} />}
              {view === "signup" && <AuthPage mode="register" auth={auth} setAuth={setAuth} setView={setView} onAdminAuth={openAdminAuth} />}
              {view === "admin-auth" && <AdminAuthPage auth={auth} setAuth={setAuth} setView={setView} />}
            </div>
          </motion.main>
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex">
        <Sidebar view={appView} setView={setView} />
        <main className="min-w-0 flex-1 lg:pl-72">
          <Topbar
            view={appView}
            setView={setView}
            dark={dark}
            setDark={setDark}
            auth={auth}
            onAuth={openAuth}
            onLogout={logout}
            search={search}
            setSearch={setSearch}
            notificationCount={notificationCount}
            onNotifications={openNotifications}
          />
          <AnimatePresence mode="wait">
            <motion.div
              key={appView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22 }}
              className="mx-auto max-w-[1480px] px-4 pb-24 pt-5 sm:px-5 lg:px-8 lg:pb-8"
            >
              {notice && <StatusPanel tone="error" message={notice} />}
              {loading && <StatusPanel tone="info" message="Loading platform data..." />}
              {appView === "dashboard" && <Dashboard auth={auth} data={data} openChallenge={openChallenge} setView={setView} />}
              {appView === "challenge" && <ChallengesView auth={auth} setAuth={setAuth} challenges={data.challenges} selectedChallenge={challenge} openChallenge={openChallenge} />}
              {appView === "path" && <LearningPath auth={auth} courses={data.courses} />}
              {appView === "machines" && <Machines auth={auth} labs={data.labs} />}
              {appView === "labs" && <LabsView auth={auth} labs={data.labs} />}
              {appView === "leaderboard" && <LeaderboardView leaders={data.leaderboard} auth={auth} />}
              {appView === "certificates" && <CertificatesView auth={auth} data={data} />}
              {appView === "community" && <CommunityView auth={auth} />}
              {appView === "profile" && <ProfileView auth={auth} />}
              {appView === "settings" && <SettingsView auth={auth} dark={dark} setDark={setDark} onLogout={logout} />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <MobileNav view={appView} setView={setView} />
    </div>
  );
}

function StatusPanel({ tone, message }: { tone: "info" | "error"; message: string }) {
  return (
    <div className={cn("mb-4 break-words rounded-xl border px-4 py-3 text-sm font-semibold", tone === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-border bg-muted text-muted-foreground")}>
      {message}
    </div>
  );
}

function AdminCheckingScreen() {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-950 px-4 text-white">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.06] p-6 text-center shadow-[0_24px_80px_rgba(0,0,0,0.24)]">
        <TrainHackLogo />
        <p className="mt-5 text-sm font-semibold text-slate-300">Checking administrator access...</p>
      </div>
    </div>
  );
}

class ErrorBoundary extends Component<{ children: React.ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="grid min-h-screen place-items-center bg-slate-950 px-4 text-white">
        <div className="w-full max-w-xl rounded-2xl border border-red-300/30 bg-red-500/10 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.24)]">
          <h1 className="text-xl font-extrabold">Dashboard render error</h1>
          <p className="mt-3 break-words text-sm font-semibold text-red-100">{this.state.error.message}</p>
          <button
            className="mt-5 h-11 rounded-xl border border-white/15 bg-white/10 px-4 text-sm font-bold text-white"
            onClick={() => {
              localStorage.removeItem("trainhack-auth");
              window.location.reload();
            }}
          >
            Clear session and reload
          </button>
        </div>
      </div>
    );
  }
}

function LandingPage({
  data,
  dark,
  setDark,
  onAuth,
  setView,
}: {
  data: AppData;
  dark: boolean;
  setDark: (dark: boolean) => void;
  onAuth: (mode: AuthMode) => void;
  setView: (view: View) => void;
}) {
  const sections = [
    ["Get Started", "get-started"],
    ["Resources", "resources"],
    ["Learn", "learn"],
    ["Classroom", "classroom"],
    ["Events", "events"],
    ["Machines", "machines"],
  ] as const;
  const hackingProcesses = [
    "Scanning open ports",
    "Mapping attack surface",
    "Enumerating services",
    "Testing trust boundary",
    "Launching exploit chain",
    "Capturing flag",
    "Writing progress report",
  ];
  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const sectionReveal = {
    initial: { opacity: 0, y: 28 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.2 },
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  } as const;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <motion.header
        className="fixed inset-x-0 top-0 z-50 border-b border-border bg-surface/95 px-4 py-2 shadow-sm backdrop-blur sm:px-6 lg:px-8"
        initial={{ y: -72, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="mx-auto grid min-h-14 max-w-[1480px] items-center gap-3 lg:grid-cols-[1fr_auto_1fr]">
          <button onClick={() => scrollTo("top")} className="flex items-center gap-3 text-left">
            <TrainHackLogo compact />
            <span>
              <span className="block text-base font-extrabold">TrainHack</span>
              <span className="hidden text-xs font-bold uppercase text-muted-foreground sm:block">Security Academy</span>
            </span>
          </button>
          <nav className="order-3 mx-auto flex max-w-full gap-1 overflow-x-auto rounded-full border border-border bg-background/70 p-1 shadow-sm lg:order-none" aria-label="Landing navigation">
            {sections.map(([label, id]) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className="h-9 shrink-0 rounded-full px-4 text-sm font-bold text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
              >
                {label}
              </button>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setDark(!dark)} aria-label="Toggle theme" title="Toggle theme">
              {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            <Button variant="outline" size="sm" onClick={() => onAuth("login")}>Login</Button>
            <Button size="sm" onClick={() => onAuth("register")}>Sign Up</Button>
          </div>
        </div>
      </motion.header>

      <main id="top" className="pt-[73px]">
        <section id="get-started" className="mx-auto grid min-h-[calc(100vh-73px)] max-w-[1480px] gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.12fr_0.88fr] lg:items-center lg:px-8">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
            <p className="text-xs font-extrabold uppercase text-primary">Learn. Practice. Hack. Succeed.</p>
            <h1 className="mt-5 max-w-4xl text-4xl font-extrabold tracking-normal sm:text-6xl">
              TrainHack is a hands-on cybersecurity academy for learning by solving.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
              Build real security skill through guided learning paths, challenge libraries, live machines, classroom workflows, and event-style practice.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button onClick={() => onAuth("register")}>
                <Sparkles className="h-4 w-4" />
                Get Started
              </Button>
              <Button variant="outline" onClick={() => setView("dashboard")}>
                Explore Platform
              </Button>
            </div>
          </motion.div>

          <motion.div
            className="overflow-hidden rounded-3xl"
            initial={{ opacity: 0, x: 20, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.55, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="trainhack-visual relative min-h-[430px] overflow-hidden rounded-3xl bg-[#020711] p-5 text-white shadow-[0_24px_90px_rgba(7,139,255,0.18)]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_46%,rgba(7,139,255,0.24),transparent_28%),radial-gradient(circle_at_82%_72%,rgba(20,184,166,0.2),transparent_30%)]" />
              <motion.div
                className="auth-grid absolute inset-0"
                animate={{ opacity: [0, 0.05, 0.25, 0.25, 0] }}
                transition={{ duration: 15, repeat: Infinity, times: [0, 0.2, 0.36, 0.88, 1], ease: "easeInOut" }}
              />
              <motion.div
                className="absolute left-1/2 top-[47%] h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full border border-teal-300/40 bg-teal-300/5 shadow-[0_0_70px_rgba(20,184,166,0.28)]"
                animate={{ opacity: [1, 1, 0.35, 0.15, 1], scale: [0.85, 1.08, 1.2, 1.2, 0.85] }}
                transition={{ duration: 15, repeat: Infinity, times: [0, 0.28, 0.42, 0.9, 1], ease: "easeInOut" }}
              />
              <motion.div
                className="radar-sweep absolute left-1/2 top-[47%] h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full"
                animate={{ rotate: [0, 1080], opacity: [1, 1, 0.25, 0.15, 1] }}
                transition={{ duration: 15, repeat: Infinity, times: [0, 0.34, 0.44, 0.9, 1], ease: "linear" }}
              />
              <motion.div
                className="absolute left-1/2 top-[47%] h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-200 shadow-[0_0_24px_rgba(20,184,166,0.9)]"
                animate={{ scale: [1, 1.7, 1, 1, 1], opacity: [1, 1, 0.4, 0.4, 1] }}
                transition={{ duration: 15, repeat: Infinity, times: [0, 0.2, 0.42, 0.9, 1] }}
              />
              <motion.div
                className="pointer-events-none absolute inset-0 opacity-25"
                animate={{ opacity: [0, 0, 0, 0.42, 0.7, 0] }}
                transition={{ duration: 15, repeat: Infinity, times: [0, 0.34, 0.44, 0.56, 0.88, 1] }}
              >
                {Array.from({ length: 14 }).map((_, index) => (
                  <motion.span
                    key={index}
                    className="absolute h-px w-24 bg-gradient-to-r from-transparent via-teal-300 to-transparent"
                    style={{
                      left: `${(index * 17) % 95}%`,
                      top: `${10 + ((index * 23) % 78)}%`,
                    }}
                    animate={{ x: [-90, 90], opacity: [0, 1, 0] }}
                    transition={{ duration: 2.2 + (index % 4) * 0.35, repeat: Infinity, delay: 7.2 + index * 0.12, ease: "linear" }}
                  />
                ))}
              </motion.div>
              <motion.div
                className="absolute left-[11%] top-[22%] h-40 w-40 rounded-full border border-[#078bff]/45 shadow-[0_0_60px_rgba(7,139,255,0.32)]"
                animate={{ rotate: [0, 360], opacity: [0, 0, 0, 1, 1, 0] }}
                transition={{ duration: 15, repeat: Infinity, times: [0, 0.34, 0.44, 0.56, 0.88, 1], ease: "linear" }}
              />
              <motion.div
                className="absolute left-[calc(11%+2.5rem)] top-[calc(22%+2.5rem)] h-20 w-20 rounded-full border border-teal-300/50"
                animate={{ rotate: [0, -360], scale: [1, 1.12, 1], opacity: [0, 0, 0, 1, 1, 0] }}
                transition={{ duration: 15, repeat: Infinity, times: [0, 0.34, 0.44, 0.56, 0.88, 1], ease: "linear" }}
              />
              <motion.div
                className="absolute left-1/2 top-[47%] h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-teal-200 shadow-[0_0_45px_rgba(20,184,166,0.55)]"
                animate={{ opacity: [0, 0, 1, 0.2, 0, 0], scale: [0.55, 0.55, 1.45, 2, 2.4, 0.55] }}
                transition={{ duration: 15, repeat: Infinity, times: [0, 0.28, 0.36, 0.42, 0.48, 1], ease: "easeOut" }}
              />
              <motion.div
                className="absolute bottom-[30%] left-[20%] right-[18%] h-px bg-gradient-to-r from-[#078bff] via-teal-300 to-[#078bff]"
                animate={{ opacity: [0, 0, 0, 1, 1, 0], scaleX: [0.2, 0.2, 0.2, 1, 0.7, 0.2] }}
                transition={{ duration: 15, repeat: Infinity, times: [0, 0.44, 0.52, 0.64, 0.86, 1], ease: "easeInOut" }}
              />
              <motion.div
                className="absolute inset-x-[9%] top-[18%] h-[58%]"
                animate={{ opacity: [0, 0, 0, 1, 1, 0] }}
                transition={{ duration: 15, repeat: Infinity, times: [0, 0.4, 0.5, 0.6, 0.88, 1] }}
              >
                <svg className="h-full w-full overflow-visible" viewBox="0 0 520 260" aria-hidden="true">
                  <motion.path
                    d="M58 78 C135 26 186 194 268 116 S410 34 468 82"
                    fill="none"
                    stroke="rgba(20,184,166,0.55)"
                    strokeWidth="2"
                    strokeDasharray="12 10"
                    animate={{ pathLength: [0, 0, 1, 1, 0], opacity: [0, 0, 0.9, 0.9, 0] }}
                    transition={{ duration: 15, repeat: Infinity, times: [0, 0.48, 0.62, 0.86, 1] }}
                  />
                  <motion.path
                    d="M96 178 C168 122 232 232 314 168 S420 126 478 194"
                    fill="none"
                    stroke="rgba(7,139,255,0.5)"
                    strokeWidth="2"
                    strokeDasharray="8 12"
                    animate={{ pathLength: [0, 0, 1, 1, 0], opacity: [0, 0, 0.75, 0.75, 0] }}
                    transition={{ duration: 15, repeat: Infinity, times: [0, 0.52, 0.68, 0.88, 1] }}
                  />
                  {[
                    [58, 78],
                    [156, 122],
                    [268, 116],
                    [392, 78],
                    [468, 82],
                    [96, 178],
                    [314, 168],
                    [478, 194],
                  ].map(([cx, cy], index) => (
                    <motion.circle
                      key={`${cx}-${cy}`}
                      cx={cx}
                      cy={cy}
                      r="5"
                      fill={index % 2 ? "rgba(7,139,255,0.95)" : "rgba(20,184,166,0.95)"}
                      animate={{ scale: [0, 0, 1.4, 1, 0], opacity: [0, 0, 1, 0.85, 0] }}
                      transition={{ duration: 15, repeat: Infinity, times: [0, 0.46 + index * 0.01, 0.58 + index * 0.01, 0.88, 1] }}
                    />
                  ))}
                </svg>
              </motion.div>
              <motion.div
                className="absolute inset-0"
                animate={{ opacity: [0, 0, 0, 1, 1, 0] }}
                transition={{ duration: 15, repeat: Infinity, times: [0, 0.42, 0.52, 0.62, 0.88, 1] }}
              >
                {[
                  ["18%", "30%"],
                  ["34%", "62%"],
                  ["54%", "34%"],
                  ["72%", "58%"],
                  ["84%", "28%"],
                ].map(([left, top], index) => (
                  <motion.span
                    key={`${left}-${top}`}
                    className="absolute h-3 w-3 rounded-full bg-teal-200 shadow-[0_0_22px_rgba(20,184,166,0.85)]"
                    style={{ left, top }}
                    animate={{ scale: [0.6, 1.45, 0.85], opacity: [0.2, 1, 0.75] }}
                    transition={{ duration: 1.8, repeat: Infinity, delay: 6 + index * 0.18, ease: "easeInOut" }}
                  />
                ))}
              </motion.div>
              <motion.div
                className="absolute bottom-6 left-6 right-6 rounded-2xl border border-teal-300/25 bg-black/55 p-4 shadow-[0_0_38px_rgba(20,184,166,0.18)] backdrop-blur"
                animate={{ opacity: [0, 0, 0, 1, 1, 0], y: [24, 24, 24, 0, 0, 24] }}
                transition={{ duration: 15, repeat: Infinity, times: [0, 0.5, 0.58, 0.68, 0.9, 1], ease: "easeInOut" }}
              >
                <div className="mb-3 flex gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-300/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-teal-300/80" />
                </div>
                <motion.p
                  className="mb-3 font-mono text-xs font-bold uppercase text-teal-200"
                  animate={{ opacity: [0, 0, 1, 1, 0], x: [-6, -6, 0, 0, -6] }}
                  transition={{ duration: 15, repeat: Infinity, times: [0, 0.56, 0.66, 0.9, 1] }}
                >
                  Hacking started
                </motion.p>
                {hackingProcesses.map((process, index) => (
                  <motion.div
                    key={process}
                    className="mb-2 grid grid-cols-[1fr_auto] items-center gap-3 font-mono text-xs"
                    animate={{ opacity: [0, 0, 1, 1, 0], x: [-8, -8, 0, 0, -8] }}
                    transition={{ duration: 15, repeat: Infinity, times: [0, 0.58 + index * 0.025, 0.66 + index * 0.025, 0.9, 1] }}
                  >
                    <span className="truncate text-blue-100">{process}</span>
                    <motion.span
                      className="h-2 w-16 rounded-full bg-gradient-to-r from-teal-200/90 to-blue-200/35"
                      animate={{ scaleX: [0.15, 1, 1, 0.15] }}
                      transition={{ duration: 15, repeat: Infinity, times: [0, 0.66 + index * 0.025, 0.9, 1] }}
                      style={{ transformOrigin: "left" }}
                    />
                  </motion.div>
                ))}
              </motion.div>

              <div className="relative z-10 flex h-full min-h-[390px] flex-col justify-between">
                <div />

                <div />

                <div />
              </div>
            </div>
          </motion.div>
        </section>

        <motion.section id="resources" className="border-y border-border bg-surface px-4 py-14 sm:px-6 lg:px-8" {...sectionReveal}>
          <div className="mx-auto max-w-[1480px]">
            <SectionHeader title="Resources" />
            <div className="grid gap-4 md:grid-cols-3">
              <LandingFeature icon={FileCheck2} index="01" title="Challenge Library" text={`${data.challenges.length} practical problems across web, crypto, forensics, cloud, and Linux privilege topics.`} />
              <LandingFeature icon={Terminal} index="02" title="Guided Practice" text="Short exercises, hints, and flags help learners build skill through repetition and reflection." />
              <LandingFeature icon={BookOpen} index="03" title="Study Material" text="Learning modules organize the why behind each technique before learners apply it." />
            </div>
          </div>
        </motion.section>

        <motion.section id="learn" className="mx-auto max-w-[1480px] px-4 py-14 sm:px-6 lg:px-8" {...sectionReveal}>
          <SectionHeader title="Learn" action={<Button variant="ghost" size="sm" onClick={() => setView("path")}>View Paths</Button>} />
          <div className="grid gap-4 lg:grid-cols-3">
            {data.courses.map((course, index) => (
              <LandingFeature key={course.slug} icon={GraduationCap} index={`0${index + 1}`} title={course.title} text={course.summary} />
            ))}
          </div>
        </motion.section>

        <motion.section id="classroom" className="border-y border-border bg-surface px-4 py-14 sm:px-6 lg:px-8" {...sectionReveal}>
          <div className="mx-auto grid max-w-[1480px] gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <motion.div initial={{ opacity: 0, x: -18 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: 0.35 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
              <p className="text-xs font-extrabold uppercase text-primary">Classroom</p>
              <h2 className="mt-3 text-3xl font-extrabold">Teach cybersecurity with trackable practice.</h2>
              <p className="mt-3 leading-7 text-muted-foreground">
                TrainHack supports a classroom-style workflow where instructors can guide learners through paths, labs, and challenge milestones.
              </p>
            </motion.div>
            <div className="grid gap-4 md:grid-cols-3">
              <LandingFeature icon={Users} index="01" title="Learner groups" text="Organize students around shared paths and practice targets." />
              <LandingFeature icon={Award} index="02" title="Milestones" text="Use XP, certificates, and challenge completions as progress signals." />
              <LandingFeature icon={Trophy} index="03" title="Rankings" text="Keep practice visible through a live leaderboard." />
            </div>
          </div>
        </motion.section>

        <motion.section id="events" className="mx-auto max-w-[1480px] px-4 py-14 sm:px-6 lg:px-8" {...sectionReveal}>
          <SectionHeader title="Events" />
          <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
          <Card className="grid gap-6 p-6 lg:grid-cols-[1fr_0.8fr] lg:p-8">
            <div>
              <Badge tone="indigo">Timed practice</Badge>
              <h2 className="mt-4 text-3xl font-extrabold">Run focused challenge drops and scoreboard sessions.</h2>
              <p className="mt-3 leading-7 text-muted-foreground">
                Events give learners pressure, structure, and momentum while the rest of the academy stays self-paced.
              </p>
            </div>
            <div className="grid gap-3">
              <Metric label="Available challenges" value={String(data.challenges.length)} />
              <Metric label="Leaderboard seats" value={String(data.leaderboard.length)} />
            </div>
          </Card>
          </motion.div>
        </motion.section>

        <motion.section id="machines" className="border-t border-border bg-surface px-4 py-14 sm:px-6 lg:px-8" {...sectionReveal}>
          <div className="mx-auto max-w-[1480px]">
            <SectionHeader title="Machines" action={<Button variant="ghost" size="sm" onClick={() => setView("machines")}>Open Machines</Button>} />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {data.labs.slice(0, 6).map((lab, index) => (
                <motion.div
                  key={lab.slug}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.25 }}
                  transition={{ duration: 0.42, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
                  whileHover={{ y: -5 }}
                >
                <Card className="h-full p-5">
                  <MonitorDot className="h-8 w-8 text-primary" />
                  <h3 className="mt-4 text-lg font-bold">{lab.name}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{lab.description}</p>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <Badge tone={difficultyTone(lab.difficulty)}>{lab.difficulty}</Badge>
                    <span className="text-sm font-semibold text-muted-foreground">{lab.os}</span>
                  </div>
                </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>
      </main>

      <motion.footer className="border-t border-border bg-background px-4 py-10 sm:px-6 lg:px-8" initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}>
        <div className="mx-auto grid max-w-[1480px] gap-8 md:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr]">
          <div>
            <TrainHackLogo />
            <p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground">
              TrainHack is a hands-on cybersecurity academy for learners, classrooms, and practice teams building real security skill.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-extrabold">Platform</h3>
            <div className="mt-3 grid gap-2 text-sm font-semibold text-muted-foreground">
              <button className="text-left hover:text-primary" onClick={() => scrollTo("learn")}>Learn</button>
              <button className="text-left hover:text-primary" onClick={() => scrollTo("machines")}>Machines</button>
              <button className="text-left hover:text-primary" onClick={() => setView("challenge")}>Challenges</button>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-extrabold">Academy</h3>
            <div className="mt-3 grid gap-2 text-sm font-semibold text-muted-foreground">
              <button className="text-left hover:text-primary" onClick={() => scrollTo("resources")}>Resources</button>
              <button className="text-left hover:text-primary" onClick={() => scrollTo("classroom")}>Classroom</button>
              <button className="text-left hover:text-primary" onClick={() => scrollTo("events")}>Events</button>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-extrabold">Start</h3>
            <div className="mt-3 grid gap-2 text-sm font-semibold text-muted-foreground">
              <button className="text-left hover:text-primary" onClick={() => onAuth("register")}>Sign Up</button>
              <button className="text-left hover:text-primary" onClick={() => onAuth("login")}>Login</button>
              <button className="text-left hover:text-primary" onClick={() => setView("dashboard")}>Open Dashboard</button>
            </div>
          </div>
        </div>
        <div className="mx-auto mt-8 flex max-w-[1480px] flex-col gap-2 border-t border-border pt-5 text-xs font-semibold text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 TrainHack. Built for safe, legal cybersecurity practice.</p>
          <p>{data.challenges.length} challenges · {data.courses.length} paths · {data.labs.length} machines</p>
        </div>
      </motion.footer>
    </div>
  );
}

function LandingFeature({ icon: Icon, index, title, text }: { icon: typeof Flag; index: string; title: string; text: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -5 }}
    >
    <Card className="group h-full p-5 hover:border-primary/30 hover:shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <span className="text-sm font-extrabold text-primary/70">{index}</span>
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary transition-transform group-hover:scale-105">
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <h3 className="mt-5 text-xl font-extrabold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
    </Card>
    </motion.div>
  );
}

function TrainHackLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn("flex min-w-0 items-center gap-3", compact && "gap-2")}>
      <img
        src={trainHackLogo}
        alt="TrainHack"
        className={cn(
          "shrink-0 rounded-2xl bg-[#020711] object-cover shadow-lift ring-1 ring-blue-400/30",
          compact ? "h-10 w-10" : "h-12 w-12",
        )}
      />
      {!compact && (
        <span className="min-w-0">
          <span className="block truncate text-lg font-extrabold tracking-normal">TrainHack</span>
          <span className="block truncate text-xs font-medium text-muted-foreground">Learn. Practice. Hack. Succeed.</span>
        </span>
      )}
    </div>
  );
}

function Sidebar({ view, setView }: { view: string; setView: (view: View) => void }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 shrink-0 border-r border-border bg-surface px-4 py-5 lg:flex lg:flex-col">
      <button onClick={() => setView("dashboard")} className="mb-7 flex w-full min-w-0 items-center gap-3 rounded-xl px-2 py-1 text-left transition-colors hover:bg-muted/60">
        <TrainHackLogo compact />
        <span className="min-w-0">
          <span className="block truncate text-lg font-extrabold tracking-normal">TrainHack</span>
          <span className="block truncate text-xs font-medium text-muted-foreground">Security Academy</span>
        </span>
      </button>
      <nav className="mt-8 grid gap-2 px-2" aria-label="Primary navigation">
        {navItems.map(([label, Icon, target]) => {
          const active = view === target;
          return (
            <button
              key={label}
              onClick={() => setView(target)}
              className={cn(
                "flex h-12 w-full items-center gap-3 rounded-xl px-3 text-sm font-bold text-muted-foreground transition-colors",
                active && "bg-primary/10 text-primary",
                !active && "hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

function Topbar({
  view,
  setView,
  dark,
  setDark,
  auth,
  onAuth,
  onLogout,
  search,
  setSearch,
  notificationCount,
  onNotifications,
}: {
  view: View;
  setView: (view: View) => void;
  dark: boolean;
  setDark: (dark: boolean) => void;
  auth: AuthState;
  onAuth: (mode: AuthMode) => void;
  onLogout: () => void;
  search: string;
  setSearch: (search: string) => void;
  notificationCount: number;
  onNotifications: () => void;
}) {
  const searchRef = useRef<HTMLInputElement>(null);

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface/95 px-4 py-3 shadow-sm backdrop-blur sm:px-5 lg:px-8">
      <div className="mx-auto flex max-w-[1480px] flex-wrap items-center gap-3">
        <button onClick={() => setView("dashboard")} className="mr-2 flex min-w-0 items-center gap-3 text-left lg:hidden">
          <TrainHackLogo compact />
          <span className="min-w-0">
            <span className="block truncate text-base font-extrabold tracking-normal">TrainHack</span>
            <span className="hidden truncate text-xs font-semibold uppercase text-muted-foreground sm:block">Security Academy</span>
          </span>
        </button>
        <div className="relative order-2 w-full min-w-0 sm:order-none sm:max-w-sm lg:max-w-md lg:mr-auto">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input ref={searchRef} className="pl-10" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search challenges, labs, paths..." aria-label="Search" />
        </div>
        <Button variant="outline" size="sm" className="hidden sm:inline-flex" onClick={() => searchRef.current?.focus()}>
          <Command className="h-4 w-4" />
          K
        </Button>
        <Button variant="soft" size="sm" className="ml-auto sm:ml-0 xl:ml-0">
          <Sparkles className="h-4 w-4" />
          <span className="hidden sm:inline">{hasAdminAccess(auth.user) ? "Admin" : auth.user ? `${auth.user.xp.toLocaleString()} XP` : "Guest"}</span>
        </Button>
        <Button variant="ghost" size="icon" aria-label="Notifications" title={`${notificationCount} notifications`} onClick={onNotifications}>
          <Bell className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => setDark(!dark)} aria-label="Toggle theme">
          {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
        {auth.user ? (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onLogout}>
              Logout
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onAuth("login")}>Login</Button>
            <Button size="sm" onClick={() => onAuth("register")}>
              <span className="hidden min-[420px]:inline">Sign Up</span>
              <span className="min-[420px]:hidden">Join</span>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}

function Dashboard({ auth, data, openChallenge, setView }: { auth: AuthState; data: AppData; openChallenge: (slug?: string) => void; setView: (view: View) => void }) {
  const hasPersonalProgress = Boolean(auth.user && auth.user.xp > 0);
  const xp = auth.user?.xp ?? 0;
  const solved = hasPersonalProgress ? Math.min(data.challenges.length, Math.floor(xp / 180)) : 0;
  const pathProgress = data.courses.length && hasPersonalProgress ? Math.min(100, Math.max(8, Math.round((xp / 1600) * 100))) : 0;
  const totalModules = data.courses.reduce((total, course) => total + course.modules.length, 0);
  const featuredChallenge = data.challenges[0];

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-primary/15 bg-surface p-6 shadow-soft lg:p-8">
        <div className="grid gap-8 xl:grid-cols-[1.18fr_0.82fr] xl:items-stretch">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-normal text-primary">TrainHack Security Academy</p>
            <h1 className="mt-4 max-w-3xl break-words text-3xl font-extrabold tracking-normal sm:text-5xl">
              {auth.user ? `Welcome back, ${auth.user.displayName ?? auth.user.username}` : "Cybersecurity, learned by doing."}
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
              {hasPersonalProgress
                ? "Continue your current path, inspect live labs, and keep turning solved challenges into measurable XP."
                : "Start with guided paths, practice in machines, and solve challenges at your own pace. Your personal progress is empty until you complete real work."}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button onClick={() => setView("path")}>
                <Play className="h-4 w-4" />
                {hasPersonalProgress ? "Continue Learning" : "Start Learning"}
              </Button>
              <Button variant="outline" onClick={() => openChallenge()}>
                <Flag className="h-4 w-4" />
                Explore Challenges
              </Button>
            </div>
          </div>
          <div className="grid gap-3 rounded-2xl border border-border bg-background/70 p-4 shadow-sm sm:grid-cols-2">
            <Metric label="XP earned" value={xp.toLocaleString()} />
            <Metric label="Current rank" value={rankFor(auth.user, data.leaderboard)} />
            <Metric label="Available modules" value={String(totalModules)} />
            <Metric label="Path progress" value={`${pathProgress}%`} />
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Flag} label="Solved Challenges" value={String(solved)} delta={data.challenges.length ? `${data.challenges.length} published` : "No challenges published"} index="01" />
        <StatCard icon={MonitorDot} label="Available Machines" value={String(data.labs.length)} delta={auth.user ? "Start a lab to create a session" : "Log in to start machines"} index="02" />
        <StatCard icon={GraduationCap} label="Learning Paths" value={String(data.courses.length)} delta={totalModules ? `${totalModules} modules ready` : "No published paths"} index="03" />
        <StatCard icon={Star} label="Total XP" value={xp.toLocaleString()} delta={auth.user ? `Level ${auth.user.level}` : "Sign in to track"} index="04" />
      </div>

      {featuredChallenge && (
        <Card className="grid gap-5 p-5 md:grid-cols-[1fr_auto] md:items-center">
          <div className="min-w-0">
            <Badge tone={difficultyTone(featuredChallenge.difficulty)}>{featuredChallenge.difficulty}</Badge>
            <h2 className="mt-3 text-xl font-extrabold">{featuredChallenge.title}</h2>
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{featuredChallenge.description}</p>
          </div>
          <Button onClick={() => openChallenge(featuredChallenge.slug)}>
            <Flag className="h-4 w-4" />
            Solve Featured
          </Button>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
        <LearningProgress auth={auth} courses={data.courses} setView={setView} />
        <RecentChallenges challenges={data.challenges} openChallenge={openChallenge} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.85fr_0.85fr]">
        <ActiveLabs auth={auth} labs={data.labs} />
        <Leaderboard leaders={data.leaderboard} />
        <ActivityFeed />
      </div>
    </div>
  );
}

function MobileNav({ view, setView }: { view: string; setView: (view: View) => void }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 px-2 py-2 backdrop-blur lg:hidden" aria-label="Mobile navigation">
      <div className="flex gap-1 overflow-x-auto pb-1">
        {navItems.map(([label, Icon, target]) => {
          const active = view === target;
          return (
            <button
              key={label}
              onClick={() => setView(target)}
              className={cn(
                "flex min-h-14 min-w-[74px] flex-col items-center justify-center gap-1 rounded-xl px-2 text-[11px] font-semibold text-muted-foreground",
                active && "bg-primary/10 text-primary",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="max-w-full truncate">{label === "Learning Paths" ? "Paths" : label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function AdminShell({
  auth,
  data,
  dark,
  setDark,
  onLogout,
}: {
  auth: AuthState;
  data: AppData;
  dark: boolean;
  setDark: (dark: boolean) => void;
  onLogout: () => void;
}) {
  const [adminView, setAdminView] = useState<AdminView>("operations");
  const adminNav = [
    ["Operations", ServerCog, "operations"],
    ["Users", Users, "users"],
    ["Content", BookOpen, "content"],
    ["Machines", MonitorDot, "machines"],
    ["Audit", FileCheck2, "audit"],
  ] as const;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-white/10 bg-slate-950 p-5 xl:block">
        <TrainHackLogo />
        <p className="mt-8 text-xs font-extrabold uppercase text-sky-200/80">Admin Console</p>
        <nav className="mt-4 grid gap-2">
          {adminNav.map(([label, Icon, target]) => (
            <button
              key={label}
              onClick={() => setAdminView(target)}
              className={cn(
                "flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold text-slate-300 transition-colors hover:bg-white/10 hover:text-white",
                adminView === target && "bg-sky-400/10 text-sky-100",
              )}
            >
              <Icon className="h-4 w-4 text-sky-200" />
              {String(label)}
            </button>
          ))}
        </nav>
      </aside>
      <div className="xl:pl-72">
        <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/90 px-4 py-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-3">
            <div className="xl:hidden">
              <TrainHackLogo compact />
            </div>
            <div>
              <p className="text-xs font-extrabold uppercase text-sky-200">Restricted administration</p>
              <h1 className="text-xl font-extrabold">TrainHack Operations</h1>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Button className="text-slate-200 hover:bg-white/10 hover:text-white" variant="ghost" size="icon" onClick={() => setDark(!dark)} aria-label="Toggle theme">
                {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
              <div className="hidden rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-bold text-blue-100 sm:block">
                {auth.user?.displayName ?? auth.user?.username}
              </div>
              <Button className="border-white/15 bg-white/10 text-white hover:bg-white/15" variant="outline" size="sm" onClick={onLogout}>Logout</Button>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1480px] px-4 py-6 sm:px-6 lg:px-8">
          {adminView === "operations" && <AdminDashboard auth={auth} data={data} onNavigate={setAdminView} />}
          {adminView === "users" && <AdminUsersView auth={auth} />}
          {adminView === "content" && <AdminContentView auth={auth} />}
          {adminView === "machines" && <AdminMachinesView auth={auth} />}
          {adminView === "audit" && <AdminAuditView auth={auth} />}
        </main>
      </div>
    </div>
  );
}

function AdminDashboard({ auth, data, onNavigate }: { auth: AuthState; data: AppData; onNavigate?: (view: AdminView) => void }) {
  const [adminData, setAdminData] = useState<AdminDashboardData | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!auth.accessToken) return;
    setLoading(true);
    api<AdminDashboardData>("/admin/dashboard", { token: auth.accessToken })
      .then((payload) => {
        setAdminData(payload.data);
        setMessage("");
      })
      .catch((error: Error) => setMessage(error.message))
      .finally(() => setLoading(false));
  }, [auth.accessToken]);

  const counts = adminData ?? {
    users: data.leaderboard.length,
    courses: data.courses.length,
    labs: data.labs.length,
    challenges: data.challenges.length,
    submissions: 0,
    auditLogs: [],
  };
  const usingFallback = !adminData;

  return (
    <div className="space-y-6">
      <section className="grid gap-6 2xl:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.24)] lg:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Badge className="bg-sky-400/15 text-sky-100" tone="teal">Administrator</Badge>
              <h2 className="mt-4 text-3xl font-extrabold tracking-normal sm:text-5xl">Operations Dashboard</h2>
              <p className="mt-3 max-w-2xl leading-7 text-slate-300">
                Monitor users, content, machines, submissions, and audit activity from a dedicated admin console.
              </p>
            </div>
            <div className={cn("w-fit rounded-2xl border px-4 py-3 text-sm font-bold", message ? "border-amber-300/30 bg-amber-300/10 text-amber-100" : "border-emerald-300/20 bg-emerald-300/10 text-emerald-100")}>
              {loading ? "Syncing dashboard" : message ? "Fallback data" : "API online"}
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
          <p className="text-xs font-extrabold uppercase text-sky-200">Signed in as</p>
          <h3 className="mt-3 text-2xl font-extrabold">{auth.user?.displayName ?? auth.user?.username}</h3>
          <p className="mt-2 break-all text-sm text-slate-300">{auth.user?.email}</p>
          <div className="mt-5 grid gap-2">
            {roleNames(auth.user).map((role) => (
              <Badge key={role} className="w-fit bg-white/10 text-slate-100" tone="slate">{role}</Badge>
            ))}
          </div>
        </div>
      </section>

      {message && <StatusPanel tone="error" message={message} />}
      {usingFallback && !message && <StatusPanel tone="info" message="Loading admin totals from the dashboard endpoint." />}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminMetric icon={Users} label="Users" value={String(counts.users)} detail="Registered accounts" onClick={() => onNavigate?.("users")} />
        <AdminMetric icon={BookOpen} label="Courses" value={String(counts.courses)} detail="Learning inventory" onClick={() => onNavigate?.("content")} />
        <AdminMetric icon={MonitorDot} label="Labs" value={String(counts.labs)} detail="Machine catalog" onClick={() => onNavigate?.("machines")} />
        <AdminMetric icon={Flag} label="Challenges" value={String(counts.challenges)} detail={`${counts.submissions} flag attempts`} onClick={() => onNavigate?.("content")} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5">
          <h3 className="text-lg font-extrabold">System Health</h3>
          <div className="mt-5 grid gap-3">
            {[
              ["API Gateway", message ? "Needs attention" : "Operational", message ? "bg-amber-300" : "bg-emerald-300"],
              ["Database", adminData ? "Connected" : "Waiting for totals", adminData ? "bg-emerald-300" : "bg-sky-300"],
              ["Content Index", `${counts.courses + counts.labs + counts.challenges} records`, "bg-sky-300"],
              ["Audit Trail", counts.auditLogs.length ? "Receiving events" : "No recent events", counts.auditLogs.length ? "bg-emerald-300" : "bg-amber-300"],
            ].map(([label, status, color]) => (
              <div key={label} className="flex flex-col gap-2 rounded-xl border border-white/10 bg-black/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <span className={cn("h-2.5 w-2.5 rounded-full", color)} />
                  <span className="font-bold">{label}</span>
                </div>
                <span className="text-sm font-semibold text-slate-300">{status}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-extrabold">Recent Audit Logs</h3>
            <Badge className="bg-white/10 text-slate-100" tone="slate">{counts.auditLogs.length}</Badge>
          </div>
          <div className="mt-4 divide-y divide-white/10">
            {counts.auditLogs.map((log) => (
              <div key={log.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-white">{log.action}</p>
                  <p className="mt-1 break-all text-xs text-slate-300">{log.resource}</p>
                </div>
                <p className="shrink-0 text-xs font-semibold text-slate-400">{new Date(log.createdAt).toLocaleString()}</p>
              </div>
            ))}
            {!counts.auditLogs.length && <p className="text-sm font-semibold text-slate-300">No audit activity yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminMetric({ icon: Icon, label, value, detail, onClick }: { icon: typeof Flag; label: string; value: string; detail: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 text-left shadow-[0_18px_55px_rgba(0,0,0,0.18)] transition-colors hover:bg-white/[0.09]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-300">{label}</p>
          <p className="mt-3 text-4xl font-extrabold text-white">{value}</p>
          <p className="mt-2 text-sm text-slate-300">{detail}</p>
        </div>
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-sky-400/15 text-sky-100">
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </button>
  );
}

function AdminPanelHeader({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-extrabold uppercase text-sky-200">Admin Console</p>
        <h2 className="mt-2 text-3xl font-extrabold tracking-normal">{title}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{description}</p>
      </div>
      {action}
    </div>
  );
}

function AdminSurface({ children }: { children: React.ReactNode }) {
  return <section className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 shadow-[0_18px_55px_rgba(0,0,0,0.18)]">{children}</section>;
}

function AdminUsersView({ auth }: { auth: AuthState }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [message, setMessage] = useState("");
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  async function loadUsers() {
    if (!auth.accessToken) return;
    setLoading(true);
    try {
      const payload = await api<AdminUser[]>(`/users?pageSize=50&search=${encodeURIComponent(searchTerm)}`, { token: auth.accessToken });
      setUsers(payload.data);
      setTotal(payload.meta?.total ?? payload.data.length);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load users.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, [auth.accessToken]);

  return (
    <div className="space-y-6">
      <AdminPanelHeader
        title="Users"
        description="Review registered accounts, roles, level, XP, and creation dates from the protected users endpoint."
        action={<Button className="border-white/15 bg-white/10 text-white hover:bg-white/15" variant="outline" onClick={loadUsers}>{loading ? "Loading" : "Refresh"}</Button>}
      />
      {message && <StatusPanel tone="error" message={message} />}
      <AdminSurface>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input className="border-white/10 bg-slate-900 text-white placeholder:text-slate-400" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search users..." />
          <Button className="bg-sky-500 text-white hover:bg-sky-600" onClick={loadUsers}>Search</Button>
        </div>
        <p className="mt-4 text-sm font-semibold text-slate-300">{total} account(s)</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-xs uppercase text-slate-400">
              <tr className="border-b border-white/10">
                <th className="py-3 pr-4">User</th>
                <th className="py-3 pr-4">Email</th>
                <th className="py-3 pr-4">Roles</th>
                <th className="py-3 pr-4">Level</th>
                <th className="py-3 pr-4">XP</th>
                <th className="py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="py-3 pr-4 font-bold text-white">{user.displayName ?? user.username}</td>
                  <td className="py-3 pr-4 text-slate-300">{user.email}</td>
                  <td className="py-3 pr-4">
                    <div className="flex flex-wrap gap-2">
                      {roleNames(user).map((role) => <Badge key={role} className="bg-white/10 text-slate-100" tone="slate">{role}</Badge>)}
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-slate-300">{user.level}</td>
                  <td className="py-3 pr-4 text-slate-300">{user.xp.toLocaleString()}</td>
                  <td className="py-3 text-slate-400">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!users.length && <p className="py-8 text-sm font-semibold text-slate-300">No users found.</p>}
        </div>
      </AdminSurface>
    </div>
  );
}

function AdminContentView({ auth }: { auth: AuthState }) {
  const [tab, setTab] = useState<"courses" | "challenges" | "labs">("courses");
  const [courses, setCourses] = useState<Course[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadContent() {
    setLoading(true);
    try {
      const [coursePayload, challengePayload, labPayload] = await Promise.all([
        api<Course[]>("/courses?pageSize=100"),
        api<Challenge[]>("/challenges?pageSize=100"),
        api<Lab[]>("/labs?pageSize=100"),
      ]);
      setCourses(coursePayload.data);
      setChallenges(challengePayload.data);
      setLabs(labPayload.data);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load content inventory.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadContent();
  }, [auth.accessToken]);

  const rows = tab === "courses" ? courses : tab === "challenges" ? challenges : labs;

  return (
    <div className="space-y-6">
      <AdminPanelHeader
        title="Content"
        description="Browse published courses, challenges, and labs from the platform inventory."
        action={<Button className="border-white/15 bg-white/10 text-white hover:bg-white/15" variant="outline" onClick={loadContent}>{loading ? "Loading" : "Refresh"}</Button>}
      />
      {message && <StatusPanel tone="error" message={message} />}
      <div className="grid gap-4 md:grid-cols-3">
        <AdminMetric icon={BookOpen} label="Courses" value={String(courses.length)} detail="Published paths" onClick={() => setTab("courses")} />
        <AdminMetric icon={Flag} label="Challenges" value={String(challenges.length)} detail="CTF inventory" onClick={() => setTab("challenges")} />
        <AdminMetric icon={MonitorDot} label="Labs" value={String(labs.length)} detail="Machine inventory" onClick={() => setTab("labs")} />
      </div>
      <AdminSurface>
        <div className="mb-4 flex flex-wrap gap-2">
          {(["courses", "challenges", "labs"] as const).map((item) => (
            <button key={item} onClick={() => setTab(item)} className={cn("h-9 rounded-xl px-4 text-sm font-bold capitalize text-slate-300 hover:bg-white/10", tab === item && "bg-sky-400/15 text-sky-100")}>
              {item}
            </button>
          ))}
        </div>
        <div className="grid gap-3">
          {rows.map((item) => (
            <div key={item.slug} className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="font-extrabold text-white">{"title" in item ? item.title : item.name}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-300">{"summary" in item ? item.summary : item.description}</p>
                </div>
                <Badge className="w-fit shrink-0" tone={difficultyTone(item.difficulty)}>{item.difficulty}</Badge>
              </div>
            </div>
          ))}
          {!rows.length && <p className="text-sm font-semibold text-slate-300">No {tab} found.</p>}
        </div>
      </AdminSurface>
    </div>
  );
}

function AdminMachinesView({ auth }: { auth: AuthState }) {
  const [labs, setLabs] = useState<Lab[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadLabs() {
    setLoading(true);
    try {
      const payload = await api<Lab[]>("/labs?pageSize=100");
      setLabs(payload.data);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load machines.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLabs();
  }, [auth.accessToken]);

  return (
    <div className="space-y-6">
      <AdminPanelHeader
        title="Machines"
        description="Inspect the lab machine catalog, operating systems, time limits, and difficulty distribution."
        action={<Button className="border-white/15 bg-white/10 text-white hover:bg-white/15" variant="outline" onClick={loadLabs}>{loading ? "Loading" : "Refresh"}</Button>}
      />
      {message && <StatusPanel tone="error" message={message} />}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {labs.map((lab) => (
          <AdminSurface key={lab.slug}>
            <div className="flex items-start justify-between gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-sky-400/15 text-sky-100">
                <MonitorDot className="h-5 w-5" />
              </span>
              <Badge tone={difficultyTone(lab.difficulty)}>{lab.difficulty}</Badge>
            </div>
            <h3 className="mt-4 text-lg font-extrabold">{lab.name}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">{lab.description}</p>
            <div className="mt-4 flex items-center justify-between text-sm font-bold text-slate-300">
              <span>{lab.os}</span>
              <span>{lab.timeLimitMinutes}m</span>
            </div>
          </AdminSurface>
        ))}
        {!labs.length && <AdminSurface><p className="text-sm font-semibold text-slate-300">No machines found.</p></AdminSurface>}
      </div>
    </div>
  );
}

function AdminAuditView({ auth }: { auth: AuthState }) {
  const [logs, setLogs] = useState<AdminDashboardData["auditLogs"]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadAudit() {
    if (!auth.accessToken) return;
    setLoading(true);
    try {
      const payload = await api<AdminDashboardData>("/admin/dashboard", { token: auth.accessToken });
      setLogs(payload.data.auditLogs);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load audit logs.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAudit();
  }, [auth.accessToken]);

  return (
    <div className="space-y-6">
      <AdminPanelHeader
        title="Audit"
        description="Review the latest recorded administrative and platform activity."
        action={<Button className="border-white/15 bg-white/10 text-white hover:bg-white/15" variant="outline" onClick={loadAudit}>{loading ? "Loading" : "Refresh"}</Button>}
      />
      {message && <StatusPanel tone="error" message={message} />}
      <AdminSurface>
        <div className="divide-y divide-white/10">
          {logs.map((log) => (
            <div key={log.id} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-white">{log.action}</p>
                <p className="mt-1 break-all text-xs text-slate-300">{log.resource}</p>
              </div>
              <p className="shrink-0 text-xs font-semibold text-slate-400">{new Date(log.createdAt).toLocaleString()}</p>
            </div>
          ))}
          {!logs.length && <p className="text-sm font-semibold text-slate-300">No audit activity yet.</p>}
        </div>
      </AdminSurface>
    </div>
  );
}

function rankFor(user: User | null, leaders: User[]) {
  if (!user) return "-";
  const index = leaders.findIndex((leader) => leader.id === user.id);
  return index >= 0 ? `#${index + 1}` : "-";
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-border bg-muted/45 p-4">
      <div className="text-sm font-medium text-muted-foreground">{label}</div>
      <div className="mt-2 break-words text-2xl font-extrabold">{value}</div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, delta, index }: { icon: typeof Flag; label: string; value: string; delta: string; index?: string }) {
  return (
    <Card className="group p-5 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          {index && <p className="mb-3 text-sm font-extrabold text-primary/70">{index}</p>}
          <p className="text-sm font-semibold text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-extrabold">{value}</p>
          <p className="mt-2 text-sm text-muted-foreground">{delta}</p>
        </div>
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary transition-transform group-hover:scale-105">
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </Card>
  );
}

function LearningProgress({ auth, courses, setView }: { auth: AuthState; courses: Course[]; setView: (view: View) => void }) {
  const hasPersonalProgress = Boolean(auth.user && auth.user.xp > 0);

  return (
    <section>
      <SectionHeader title="Learning Progress" action={<Button variant="ghost" size="sm" onClick={() => setView("path")}>View all</Button>} />
      {!courses.length && (
        <Card className="p-5">
          <BookOpen className="h-8 w-8 text-primary" />
          <h3 className="mt-4 font-bold">No learning paths yet</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Published courses will appear here with module progress and start actions.</p>
        </Card>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {courses.map((course) => (
          <Card key={course.slug} className="p-5 hover:-translate-y-0.5 hover:shadow-soft">
            <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent/12 text-teal-700 dark:text-teal-200">
                  <BookOpen className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h3 className="font-bold">{course.title}</h3>
                  <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">{course.summary}</p>
                </div>
              </div>
              <Badge className="w-fit shrink-0" tone={difficultyTone(course.difficulty)}>{course.difficulty}</Badge>
            </div>
            <Progress value={hasPersonalProgress ? Math.min(100, course.modules.length * 22) : 0} />
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm font-semibold text-muted-foreground">
                {hasPersonalProgress ? `${course.modules.length} modules` : "No lessons completed yet"}
              </span>
              <Button variant="soft" size="sm" onClick={() => setView("path")}>{hasPersonalProgress ? "Continue" : "Start"}</Button>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}

function RecentChallenges({ challenges, openChallenge }: { challenges: Challenge[]; openChallenge: (slug?: string) => void }) {
  return (
    <section>
      <SectionHeader title="Recent Challenges" action={<Button variant="ghost" size="sm" onClick={() => openChallenge()}>Browse</Button>} />
      <Card className="divide-y divide-border overflow-hidden">
        {!challenges.length && (
          <div className="p-5">
            <Flag className="h-8 w-8 text-primary" />
            <h3 className="mt-4 font-bold">No challenges published</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Challenges from the backend will appear here as soon as they are available.</p>
          </div>
        )}
        {challenges.map((challenge) => (
          <div key={challenge.slug} className="p-5 transition-colors hover:bg-muted/45">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="font-bold">{challenge.title}</h3>
                <p className="mt-1 truncate text-sm text-muted-foreground">{challenge.category?.name ?? "Challenge"}</p>
              </div>
              <Badge className="shrink-0" tone={difficultyTone(challenge.difficulty)}>{challenge.difficulty}</Badge>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-primary">{challenge.baseXp} XP</span>
              <Button size="sm" onClick={() => openChallenge(challenge.slug)}>Solve</Button>
            </div>
          </div>
        ))}
      </Card>
    </section>
  );
}

function ActiveLabs({ auth, labs }: { auth: AuthState; labs: Lab[] }) {
  const { message, loading, actionSlug, flagSlug, loadAttempts, toggleLab, submitLabFlag, runningFor } = useLabSessions(auth);
  const runningLabs = labs.filter((lab) => runningFor(lab.slug));

  return (
    <section>
      <SectionHeader
        title="Active Labs"
        action={<Button variant="outline" size="sm" onClick={loadAttempts} disabled={loading}>{loading ? "Refreshing" : "Refresh"}</Button>}
      />
      {message && <StatusPanel tone="info" message={message} />}
      {runningLabs.length > 0 && (
        <div className="mb-5 grid gap-4 lg:grid-cols-2">
          {runningLabs.map((lab) => {
            const running = runningFor(lab.slug)!;
            return <LabSessionPanel key={lab.slug} lab={lab} attempt={running} flagBusy={flagSlug === lab.slug} onSubmitFlag={submitLabFlag} compact />;
          })}
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {!labs.length && <EmptyLabState />}
        {labs.map((lab) => {
          const running = runningFor(lab.slug);
          return (
            <MachineCard
              key={lab.slug}
              lab={lab}
              running={running}
              actionBusy={actionSlug === lab.slug}
              flagBusy={flagSlug === lab.slug}
              onToggle={toggleLab}
              onSubmitFlag={submitLabFlag}
              mode="lab"
            />
          );
        })}
      </div>
    </section>
  );
}

function LabSessionPanel({
  lab,
  attempt,
  flagBusy,
  onSubmitFlag,
  compact = false,
}: {
  lab: Lab;
  attempt: LabAttempt;
  flagBusy: boolean;
  onSubmitFlag: (lab: Lab, flag: string) => Promise<LabFlagResult | null>;
  compact?: boolean;
}) {
  const [flag, setFlag] = useState("");
  const [result, setResult] = useState<LabFlagResult | null>(null);
  const target = attempt.target;

  async function submit() {
    const payload = await onSubmitFlag(lab, flag);
    setResult(payload);
    if (payload?.correct) setFlag("");
  }

  return (
    <div className={cn("rounded-2xl border border-sky-200/80 bg-gradient-to-br from-sky-50 to-white p-4 shadow-sm dark:border-sky-500/20 dark:from-sky-950/35 dark:to-slate-950", !compact && "mt-4")}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-lift">
            <Terminal className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold text-primary">Target online</p>
            <p className="mt-1 text-xs font-semibold text-muted-foreground">Started {shortDateTime(attempt.startedAt)} | {timeLeftLabel(attempt.expiresAt)}</p>
          </div>
        </div>
        <Badge tone="teal">{target?.rewardXp ?? 180} XP</Badge>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border/80 bg-white/80 p-3 dark:bg-slate-950/60">
          <div className="mb-2 flex items-center gap-2 text-xs font-extrabold uppercase text-muted-foreground">
            <ServerCog className="h-4 w-4" />
            Connection
          </div>
          <p className="break-all text-sm font-bold">{target?.url ?? `http://${attempt.ipAddress ?? "target.local"}`}</p>
          <p className="mt-1 text-xs text-muted-foreground">IP: {attempt.ipAddress ?? target?.address ?? "-"}</p>
        </div>
        <div className="rounded-xl border border-border/80 bg-white/80 p-3 dark:bg-slate-950/60">
          <div className="mb-2 flex items-center gap-2 text-xs font-extrabold uppercase text-muted-foreground">
            <KeyRound className="h-4 w-4" />
            Credentials
          </div>
          <p className="text-sm font-bold">{target?.username ?? "learner"}</p>
          <p className="mt-1 break-all text-xs text-muted-foreground">{target?.password ?? `trainhack-${lab.slug}`}</p>
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-muted-foreground">{target?.objective ?? "Enumerate the machine and submit the proof flag."}</p>
      <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-4 text-slate-100 shadow-inner">
        <div className="mb-3 flex items-center gap-2 text-xs font-bold text-slate-400">
          <Terminal className="h-4 w-4" />
          Suggested checks
        </div>
        <pre className="overflow-x-auto text-xs leading-6"><code>{(target?.commands ?? [`nmap -sV ${attempt.ipAddress ?? "target"}`]).join("\n")}</code></pre>
      </div>

      <div className="mt-4 grid gap-2">
        {(target?.clues ?? []).map((clue) => (
          <p key={clue} className="rounded-xl border border-border/80 bg-white/70 px-3 py-2 text-xs font-semibold leading-5 text-muted-foreground dark:bg-slate-950/50">{clue}</p>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input value={flag} onChange={(event) => setFlag(event.target.value)} placeholder={target?.flagFormat ?? "TH{...}"} aria-label={`${lab.name} lab flag`} />
        <Button onClick={submit} disabled={!flag || flagBusy} className="sm:w-40">
          {flagBusy ? "Checking" : "Submit Flag"}
        </Button>
      </div>
      {result && (
        <p className={cn("mt-3 text-sm font-bold", result.correct ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300")}>
          {result.correct ? (result.awardedXp ? `Completed. +${result.awardedXp} XP` : "Completed already.") : "Incorrect flag. Keep going."}
        </p>
      )}
    </div>
  );
}

function EmptyLabState() {
  return (
    <Card className="p-6">
      <MonitorDot className="h-8 w-8 text-primary" />
      <h3 className="mt-4 font-bold">No machines available</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">Published lab machines will appear here from the backend catalog.</p>
    </Card>
  );
}

function MachineCard({
  lab,
  running,
  actionBusy,
  flagBusy,
  onToggle,
  onSubmitFlag,
  mode = "machine",
}: {
  lab: Lab;
  running?: LabAttempt;
  actionBusy: boolean;
  flagBusy: boolean;
  onToggle: (lab: Lab) => void;
  onSubmitFlag: (lab: Lab, flag: string) => Promise<LabFlagResult | null>;
  mode?: "machine" | "lab";
}) {
  return (
    <Card className={cn("group overflow-hidden p-0 hover:-translate-y-0.5 hover:shadow-soft", running && "border-primary/30 shadow-soft")}>
      <div className={cn("h-1.5 bg-slate-200 dark:bg-slate-800", running && "bg-gradient-to-r from-primary to-accent")} />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary", running && "bg-primary text-primary-foreground shadow-lift")}>
            <MonitorDot className="h-5 w-5" />
          </span>
          <div className="flex flex-wrap justify-end gap-2">
            <Badge tone={running ? "teal" : "slate"}>{running ? "Running" : "Stopped"}</Badge>
            <Badge tone={difficultyTone(lab.difficulty)}>{lab.difficulty}</Badge>
          </div>
        </div>

        <div className="mt-5 min-w-0">
          <p className="text-xs font-extrabold uppercase text-primary">{lab.category?.name ?? "Lab Machine"}</p>
          <h2 className="mt-2 text-xl font-extrabold tracking-normal">{lab.name}</h2>
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">{lab.description}</p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-xl border border-border bg-muted/35 p-3">
            <p className="text-xs font-bold uppercase text-muted-foreground">OS</p>
            <p className="mt-1 truncate font-extrabold">{lab.os}</p>
          </div>
          <div className="rounded-xl border border-border bg-muted/35 p-3">
            <p className="text-xs font-bold uppercase text-muted-foreground">Limit</p>
            <p className="mt-1 font-extrabold">{lab.timeLimitMinutes}m</p>
          </div>
        </div>

        {running && <LabSessionPanel lab={lab} attempt={running} flagBusy={flagBusy} onSubmitFlag={onSubmitFlag} />}

        <Button className="mt-5 w-full" variant={running ? "outline" : "primary"} onClick={() => onToggle(lab)} disabled={actionBusy}>
          {actionBusy ? "Working" : running ? `Stop ${mode === "lab" ? "Lab" : "Machine"}` : `Start ${mode === "lab" ? "Lab" : "Machine"}`}
        </Button>
      </div>
    </Card>
  );
}

function Leaderboard({ leaders }: { leaders: User[] }) {
  return (
    <section>
      <SectionHeader title="Leaderboard" />
      <Card className="divide-y divide-border overflow-hidden">
        {!leaders.length && (
          <div className="p-5">
            <Trophy className="h-8 w-8 text-primary" />
            <h3 className="mt-4 font-bold">No rankings yet</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Learners will appear after earning XP.</p>
          </div>
        )}
        {leaders.map((leader, index) => (
          <div key={leader.id} className="flex items-center gap-3 p-4">
            <span className="w-6 text-sm font-bold text-primary">#{index + 1}</span>
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-muted text-sm font-bold">{leader.username.slice(0, 2).toUpperCase()}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{leader.displayName ?? leader.username}</p>
              <p className="text-xs text-muted-foreground">Level {leader.level}</p>
            </div>
            <span className="text-sm font-semibold">{leader.xp.toLocaleString()} XP</span>
          </div>
        ))}
      </Card>
    </section>
  );
}

function ActivityFeed() {
  const [posts, setPosts] = useState<CommunityPost[]>([]);

  useEffect(() => {
    api<CommunityPost[]>("/community")
      .then((payload) => setPosts(payload.data.slice(0, 4)))
      .catch(() => setPosts([]));
  }, []);

  return (
    <section>
      <SectionHeader title="Activity Feed" />
      <Card className="p-5">
        <div className="space-y-5">
          {posts.map((post) => (
            <div key={post.id} className="flex gap-3">
              <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent/12 text-teal-700">
                <CheckCircle2 className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold">{post.metadata?.message ?? "Community update"}</p>
                <p className="mt-1 text-xs text-muted-foreground">{post.user?.username ?? "Learner"} | {new Date(post.createdAt).toLocaleString()}</p>
              </div>
            </div>
          ))}
          {!posts.length && <p className="text-sm font-semibold text-muted-foreground">No community activity yet.</p>}
        </div>
      </Card>
    </section>
  );
}

function Machines({ auth, labs }: { auth: AuthState; labs: Lab[] }) {
  const { message, loading, actionSlug, flagSlug, loadAttempts, toggleLab, submitLabFlag, runningFor } = useLabSessions(auth);
  const runningCount = labs.filter((lab) => runningFor(lab.slug)).length;
  const availableCount = Math.max(0, labs.length - runningCount);

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden p-0">
        <div className="border-b border-border bg-gradient-to-br from-white via-sky-50 to-teal-50 p-6 dark:from-slate-950 dark:via-sky-950/40 dark:to-teal-950/20">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <Badge tone={runningCount ? "teal" : "slate"}>{runningCount ? `${runningCount} running` : "All machines idle"}</Badge>
              <h1 className="mt-3 text-3xl font-extrabold tracking-normal">Machines</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Start a lab machine, inspect its target details, submit the proof flag, and stop the session when you are done.</p>
            </div>
            <Button variant="outline" onClick={loadAttempts} disabled={loading}>{loading ? "Refreshing" : "Refresh Sessions"}</Button>
          </div>
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-3">
          <MachineMetric label="Catalog" value={labs.length} detail="Published machines" />
          <MachineMetric label="Running" value={runningCount} detail="Active sessions" highlight />
          <MachineMetric label="Available" value={availableCount} detail="Ready to start" />
        </div>
      </Card>
      {message && <StatusPanel tone="info" message={message} />}
      <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {!labs.length && <EmptyLabState />}
        {labs.map((lab) => {
          const running = runningFor(lab.slug);
          return (
            <MachineCard
              key={lab.slug}
              lab={lab}
              running={running}
              actionBusy={actionSlug === lab.slug}
              flagBusy={flagSlug === lab.slug}
              onToggle={toggleLab}
              onSubmitFlag={submitLabFlag}
            />
          );
        })}
      </div>
    </div>
  );
}

function MachineMetric({ label, value, detail, highlight = false }: { label: string; value: number; detail: string; highlight?: boolean }) {
  return (
    <div className={cn("rounded-xl border border-border bg-muted/35 p-4", highlight && "border-primary/25 bg-primary/5")}>
      <p className="text-xs font-bold uppercase text-muted-foreground">{label}</p>
      <p className={cn("mt-2 text-2xl font-extrabold", highlight && "text-primary")}>{value}</p>
      <p className="mt-1 text-xs font-semibold text-muted-foreground">{detail}</p>
    </div>
  );
}

function LabsView({ auth, labs }: { auth: AuthState; labs: Lab[] }) {
  return (
    <div className="space-y-6">
      <Card className="overflow-hidden p-0">
        <div className="border-b border-border bg-gradient-to-br from-white via-teal-50 to-sky-50 p-6 dark:from-slate-950 dark:via-teal-950/30 dark:to-sky-950/30">
          <Badge tone="teal">Hands-on sessions</Badge>
          <h1 className="mt-3 text-3xl font-extrabold tracking-normal">Labs</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Launch machines, work through target notes, and submit proof flags from the active session panel.</p>
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-3">
          <MachineMetric label="Labs" value={labs.length} detail="Available catalog" />
          <MachineMetric label="Beginner" value={labs.filter((lab) => lab.difficulty === "BEGINNER" || lab.difficulty === "EASY").length} detail="Entry friendly" highlight />
          <MachineMetric label="Advanced" value={labs.filter((lab) => lab.difficulty === "HARD" || lab.difficulty === "EXPERT").length} detail="Higher pressure" />
        </div>
      </Card>
      <ActiveLabs auth={auth} labs={labs} />
    </div>
  );
}

function LeaderboardView({ leaders, auth }: { leaders: User[]; auth: AuthState }) {
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <Badge tone="teal">Live rankings</Badge>
        <h1 className="mt-3 text-3xl font-extrabold">Leaderboard</h1>
        <p className="mt-2 text-muted-foreground">Rankings are loaded from the backend and sorted by XP.</p>
      </Card>
      <Leaderboard leaders={leaders} />
      {auth.user && <StatusPanel tone="info" message={`Your current rank is ${rankFor(auth.user, leaders)}.`} />}
    </div>
  );
}

function CertificatesView({ auth, data }: { auth: AuthState; data: AppData }) {
  const unlocked = Boolean(auth.user && auth.user.xp >= 1000);
  const [message, setMessage] = useState("");
  const [certificates, setCertificates] = useState<Certificate[]>([]);

  useEffect(() => {
    if (!auth.accessToken) {
      setCertificates([]);
      return;
    }
    api<Certificate[]>("/certificates", { token: auth.accessToken })
      .then((payload) => setCertificates(payload.data))
      .catch((error: Error) => setMessage(error.message));
  }, [auth.accessToken]);

  async function issueCertificate() {
    if (!auth.accessToken) {
      setMessage("Log in to issue certificates.");
      return;
    }
    try {
      const payload = await api<Certificate>("/certificates/web-security-foundations/issue", {
        method: "POST",
        token: auth.accessToken,
      });
      setCertificates((current) => [payload.data, ...current.filter((certificate) => certificate.id !== payload.data.id)]);
      setMessage(`Certificate issued: ${payload.data.serial}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Certificate action failed.");
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader title="Certificates" />
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-6">
          <FileCheck2 className="h-9 w-9 text-primary" />
          <h2 className="mt-4 text-xl font-bold">Web Security Foundations</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {unlocked ? "Certificate ready for your profile." : "Earn 1,000 XP to unlock this certificate."}
          </p>
          <Button className="mt-5" disabled={!unlocked} onClick={issueCertificate}>
            {certificates.some((certificate) => certificate.title === "Web Security Foundations") ? "Refresh Certificate" : unlocked ? "Issue Certificate" : "Locked"}
          </Button>
          {message && <p className="mt-3 text-sm font-semibold text-primary">{message}</p>}
        </Card>
        {certificates.map((certificate) => (
          <Card key={certificate.id} className="p-6">
            <FileCheck2 className="h-9 w-9 text-primary" />
            <h2 className="mt-4 text-xl font-bold">{certificate.title}</h2>
          <p className="mt-2 break-all text-sm text-muted-foreground">Serial: {certificate.serial}</p>
            <p className="mt-1 text-sm text-muted-foreground">Issued: {new Date(certificate.issuedAt).toLocaleDateString()}</p>
          </Card>
        ))}
        <Card className="p-6">
          <Award className="h-9 w-9 text-teal-600" />
          <h2 className="mt-4 text-xl font-bold">Platform Progress</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {data.challenges.length} challenges, {data.labs.length} labs, and {data.courses.length} learning path(s) are available.
          </p>
        </Card>
      </div>
    </div>
  );
}

function CommunityView({ auth }: { auth: AuthState }) {
  const [joined, setJoined] = useState(() => localStorage.getItem("trainhack-community-joined") === "true");
  const [post, setPost] = useState("");
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    api<CommunityPost[]>("/community")
      .then((payload) => setPosts(payload.data))
      .catch((error: Error) => setMessage(error.message));
  }, []);

  async function addPost() {
    if (!post.trim()) return;
    if (!auth.accessToken) {
      setMessage("Log in to post to the community.");
      return;
    }

    try {
      const payload = await api<CommunityPost>("/community", {
        method: "POST",
        token: auth.accessToken,
        body: JSON.stringify({ message: post.trim() }),
      });
      setPosts([payload.data, ...posts]);
      setPost("");
      setMessage("Post published.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to publish post.");
    }
  }

  function toggleJoined() {
    const next = !joined;
    setJoined(next);
    localStorage.setItem("trainhack-community-joined", String(next));
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <Badge tone={joined ? "green" : "teal"}>{joined ? "Joined" : "Open community"}</Badge>
        <h1 className="mt-3 text-3xl font-extrabold">Community</h1>
        <p className="mt-2 text-muted-foreground">Join the local study room and post notes for your team.</p>
        <Button className="mt-5" onClick={toggleJoined}>{joined ? "Leave Room" : "Join Room"}</Button>
      </Card>
      <Card className="p-5">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input value={post} onChange={(event) => setPost(event.target.value)} placeholder={auth.user ? "Share an update..." : "Log in to personalize posts..."} />
          <Button onClick={addPost}>
            <MessageSquare className="h-4 w-4" />
            Post
          </Button>
        </div>
        {message && <p className="mt-3 text-sm font-semibold text-primary">{message}</p>}
        <div className="mt-5 divide-y divide-border">
          {posts.map((item, index) => (
            <div key={`${item.id}-${index}`} className="py-3">
              <p className="text-sm font-semibold">{item.metadata?.message ?? "Community update"}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {item.user?.displayName ?? item.user?.username ?? "Learner"} | {new Date(item.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function ProfileView({ auth }: { auth: AuthState }) {
  const [analytics, setAnalytics] = useState<ProfileAnalytics | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!auth.accessToken) {
      setAnalytics(null);
      return;
    }
    api<ProfileAnalytics>("/users/me/analytics", { token: auth.accessToken })
      .then((payload) => {
        setAnalytics(payload.data);
        setMessage("");
      })
      .catch((error: Error) => setMessage(error.message));
  }, [auth.accessToken]);

  if (!auth.user) {
    return <StatusPanel tone="info" message="Log in to view your profile analytics." />;
  }

  const categoryRows = challengeCategories
    .filter((category) => category !== "All")
    .map((category) => ({ label: category, value: analytics?.byCategory[category] ?? 0 }));
  const difficultyRows = challengeDifficulties
    .filter((difficulty) => difficulty !== "All")
    .map((difficulty) => ({ label: difficulty, value: analytics?.byDifficulty[difficulty] ?? 0 }));

  return (
    <div className="space-y-6">
      <Card className="p-6 lg:p-8">
        <Badge tone="teal">Learner profile</Badge>
        <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold">{auth.user.displayName ?? auth.user.username}</h1>
            <p className="mt-2 text-muted-foreground">{auth.user.email}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Metric label="Solved" value={String(analytics?.solvedTotal ?? 0)} />
            <Metric label="Solved XP" value={(analytics?.xpFromSolved ?? 0).toLocaleString()} />
            <Metric label="Level" value={String(auth.user.level)} />
          </div>
        </div>
      </Card>
      {message && <StatusPanel tone="error" message={message} />}
      <div className="grid gap-6 xl:grid-cols-2">
        <AnalyticsBars title="Solved by Category" rows={categoryRows} />
        <AnalyticsBars title="Solved by Difficulty" rows={difficultyRows} />
      </div>
      <Card className="p-5">
        <SectionHeader title="Recently Solved" />
        <div className="divide-y divide-border">
          {(analytics?.recentSolved ?? []).map((challenge) => (
            <div key={`${challenge.slug}-${challenge.solvedAt}`} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-bold">{challenge.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {challenge.category} | {new Date(challenge.solvedAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={difficultyTone(challenge.difficulty)}>{challenge.difficulty}</Badge>
                <Badge tone="teal">{challenge.awardedXp} XP</Badge>
              </div>
            </div>
          ))}
          {!analytics?.recentSolved.length && <p className="text-sm font-semibold text-muted-foreground">No solved challenges yet.</p>}
        </div>
      </Card>
    </div>
  );
}

function AnalyticsBars({ title, rows }: { title: string; rows: { label: string; value: number }[] }) {
  const max = Math.max(1, ...rows.map((row) => row.value));

  return (
    <Card className="p-5">
      <SectionHeader title={title} />
      <div className="grid gap-4">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="mb-2 flex items-center justify-between gap-3 text-sm font-bold">
              <span>{row.label}</span>
              <span className="text-muted-foreground">{row.value}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-700" style={{ width: `${(row.value / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function SettingsView({
  auth,
  dark,
  setDark,
  onLogout,
}: {
  auth: AuthState;
  dark: boolean;
  setDark: (dark: boolean) => void;
  onLogout: () => void;
}) {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!auth.accessToken) {
      setSettings(null);
      return;
    }
    api<UserSettings>("/settings", { token: auth.accessToken })
      .then((payload) => setSettings(payload.data))
      .catch((error: Error) => setMessage(error.message));
  }, [auth.accessToken]);

  async function updateSettings(input: Partial<UserSettings>) {
    if (!auth.accessToken) {
      setMessage("Log in to save settings.");
      return;
    }
    try {
      const payload = await api<UserSettings>("/settings", {
        method: "PUT",
        token: auth.accessToken,
        body: JSON.stringify(input),
      });
      setSettings(payload.data);
      setMessage("Settings saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save settings.");
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader title="Settings" />
      {message && <StatusPanel tone="info" message={message} />}
      <Card className="divide-y divide-border overflow-hidden">
        <div className="flex flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-bold">Theme</h2>
            <p className="mt-1 text-sm text-muted-foreground">Switch between light and dark mode.</p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              const nextDark = !dark;
              setDark(nextDark);
              updateSettings({ theme: nextDark ? "dark" : "light" });
            }}
          >
            {dark ? "Light Mode" : "Dark Mode"}
          </Button>
        </div>
        <div className="flex flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-bold">Email updates</h2>
            <p className="mt-1 text-sm text-muted-foreground">Persist notification preference in the database.</p>
          </div>
          <Button
            variant={settings?.emailNotifications ?? true ? "primary" : "outline"}
            onClick={() => updateSettings({ emailNotifications: !(settings?.emailNotifications ?? true) })}
          >
            {settings?.emailNotifications ?? true ? "Enabled" : "Disabled"}
          </Button>
        </div>
        <div className="flex flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-bold">Profile visibility</h2>
            <p className="mt-1 text-sm text-muted-foreground">Choose whether your profile is visible to other learners.</p>
          </div>
          <Button
            variant="outline"
            onClick={() => updateSettings({ profileVisibility: settings?.profileVisibility === "private" ? "public" : "private" })}
          >
            {settings?.profileVisibility === "private" ? "Private" : "Public"}
          </Button>
        </div>
        <div className="flex flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-bold">Account</h2>
            <p className="mt-1 text-sm text-muted-foreground">{auth.user ? auth.user.email : "You are browsing as a guest."}</p>
          </div>
          <Button variant="outline" disabled={!auth.user} onClick={onLogout}>
            Logout
          </Button>
        </div>
      </Card>
    </div>
  );
}

function AuthPage({
  mode,
  auth,
  setAuth,
  setView,
  onAdminAuth,
}: {
  mode: AuthMode;
  auth: AuthState;
  setAuth: (auth: AuthState) => void;
  setView: (view: View) => void;
  onAdminAuth: () => void;
}) {
  return (
    <div className="relative mx-auto w-full max-w-6xl overflow-hidden rounded-3xl border border-border bg-surface shadow-lift">
      <div className="auth-grid pointer-events-none absolute inset-0 opacity-80" />
      <motion.div
        className="auth-scan pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent"
        animate={{ y: [0, 520, 0], opacity: [0.25, 0.9, 0.25] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="relative grid min-h-[560px] lg:grid-cols-[1.15fr_0.85fr]">
        <motion.section
          className="flex flex-col justify-between gap-12 p-7 sm:p-10 lg:p-12"
          initial={{ opacity: 0, x: -18 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          <div>
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, delay: 0.08 }}
            >
              <TrainHackLogo />
            </motion.div>
            <motion.div
              className="mt-10"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            >
              <Badge tone="teal">Account access</Badge>
              <h1 className="mt-5 max-w-xl break-words text-3xl font-extrabold tracking-normal sm:text-5xl">
                {mode === "login" ? "Welcome back" : "Create your learner account"}
              </h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
                {mode === "login"
                  ? "Resume your training workspace with synced progress, labs, certificates, and preferences."
                  : "Join the training workspace and start tracking progress across challenges, paths, and labs."}
              </p>
            </motion.div>
          </div>

          <motion.div
            className="grid gap-3 text-sm sm:grid-cols-3"
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.08, delayChildren: 0.28 } },
            }}
          >
            {["Backend synced", "Lab-ready session", "Progress protected"].map((label) => (
              <motion.div
                key={label}
                className="flex items-center gap-2 rounded-2xl border border-border bg-background/70 px-3 py-3 font-semibold text-muted-foreground backdrop-blur"
                whileHover={{ y: -3, borderColor: "rgba(7, 139, 255, 0.28)" }}
                variants={{
                  hidden: { opacity: 0, y: 12 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] } },
                }}
              >
                <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                <span className="min-w-0">{label}</span>
              </motion.div>
            ))}
          </motion.div>
        </motion.section>

        <motion.aside
          className="flex items-center border-t border-border bg-background/60 p-6 backdrop-blur lg:border-l lg:border-t-0 sm:p-10"
          initial={{ opacity: 0, x: 24, scale: 0.985 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ duration: 0.55, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="w-full">
            <motion.div
              className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface/80 p-4 shadow-sm"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.42, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              <div>
                <p className="text-xs font-bold uppercase text-muted-foreground">Demo account</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{demoCredentials.email}</p>
              </div>
              <motion.span
                className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15"
                animate={{ rotate: [0, 8, -8, 0], scale: [1, 1.04, 1] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                aria-hidden="true"
              >
                <Sparkles className="h-5 w-5" />
              </motion.span>
            </motion.div>
            <AuthCard
              auth={auth}
              setAuth={setAuth}
              initialMode={mode}
              lockMode
              elevated
              alternateActionLabel={mode === "login" ? "Create an account" : "Already have an account? Login"}
              onAlternateAction={() => setView(mode === "login" ? "signup" : "login")}
              onAuthed={() => setView("dashboard")}
            />
          </div>
        </motion.aside>
      </div>
    </div>
  );
}

function AdminAuthPage({
  auth,
  setAuth,
  setView,
}: {
  auth: AuthState;
  setAuth: (auth: AuthState) => void;
  setView: (view: View) => void;
}) {
  return (
    <div className="mx-auto grid w-full max-w-6xl overflow-hidden rounded-3xl border border-border bg-surface shadow-lift lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative overflow-hidden bg-[#020711] p-7 text-white sm:p-10 lg:p-12">
        <div className="auth-grid absolute inset-0 opacity-20" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(239,68,68,0.22),transparent_32%),radial-gradient(circle_at_82%_72%,rgba(7,139,255,0.22),transparent_34%)]" />
        <div className="relative z-10 flex min-h-[460px] flex-col justify-between">
          <div>
            <TrainHackLogo />
            <Badge className="mt-10 bg-red-500/15 text-red-200" tone="red">Restricted access</Badge>
            <h1 className="mt-5 max-w-xl text-3xl font-extrabold tracking-normal sm:text-5xl">Admin operations portal</h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-blue-100">
              Sign in with an administrator or super admin account to manage platform inventory, audit activity, users, labs, and content.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["Audit", FileCheck2],
              ["Users", Users],
              ["Labs", ServerCog],
            ].map(([label, Icon]) => (
              <div key={String(label)} className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                <Icon className="h-5 w-5 text-red-200" />
                <p className="mt-3 text-sm font-bold text-blue-100">{String(label)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="flex items-center bg-background/70 p-6 sm:p-10">
        <div className="w-full">
          <AuthCard
            auth={auth}
            setAuth={setAuth}
            initialMode="login"
            lockMode
            elevated
            defaultEmail={adminCredentials.email}
            defaultPassword={adminCredentials.password}
            submitLabel="Login as Admin"
            requireAdmin
            headerTitle="Admin sign in"
            headerDescription="Use your administrator credentials to continue."
            onAuthed={() => setView("dashboard")}
          />
        </div>
      </section>
    </div>
  );
}

function ChallengesView({
  auth,
  setAuth,
  challenges,
  openChallenge,
}: {
  auth: AuthState;
  setAuth: (auth: AuthState) => void;
  challenges: Challenge[];
  selectedChallenge?: Challenge;
  openChallenge: (slug?: string) => void;
}) {
  const [category, setCategory] = useState<(typeof challengeCategories)[number]>("All");
  const [difficulty, setDifficulty] = useState<ChallengeDifficultyFilter>("All");
  const [modalChallenge, setModalChallenge] = useState<Challenge | null>(null);
  const filtered = challenges.filter((challenge) => {
    const matchesCategory = category === "All" || challenge.category?.name === category;
    const matchesDifficulty = difficulty === "All" || challenge.difficulty === difficulty;
    return matchesCategory && matchesDifficulty;
  });

  function openChallengeModal(challenge: Challenge) {
    openChallenge(challenge.slug);
    setModalChallenge(challenge);
  }

  return (
    <div className="space-y-6">
      <Card className="p-6 lg:p-8">
        <Badge tone="teal">Challenge library</Badge>
        <h1 className="mt-4 text-3xl font-extrabold">Practice by category and difficulty.</h1>
        <p className="mt-3 max-w-3xl leading-7 text-muted-foreground">
          Choose a domain, filter by Easy, Medium, or Hard, then open a challenge and submit the flag.
        </p>
        <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
          {challengeCategories.map((item) => (
            <button
              key={item}
              onClick={() => setCategory(item)}
              className={cn(
                "h-10 shrink-0 rounded-full border border-border px-4 text-sm font-bold text-muted-foreground transition-colors",
                category === item && "border-primary bg-primary/10 text-primary",
                category !== item && "hover:bg-muted hover:text-foreground",
              )}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          {challengeDifficulties.map((item) => (
            <button
              key={item}
              onClick={() => setDifficulty(item)}
              className={cn(
                "h-9 rounded-full border border-border px-4 text-sm font-bold text-muted-foreground transition-colors",
                difficulty === item && "border-primary bg-primary/10 text-primary",
                difficulty !== item && "hover:bg-muted hover:text-foreground",
              )}
            >
              {item === "All" ? "All difficulties" : item}
            </button>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((challenge) => (
          <button
            key={challenge.slug}
            onClick={() => openChallengeModal(challenge)}
            className="group flex min-h-[238px] flex-col rounded-2xl border border-border bg-surface p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-primary/30 hover:shadow-soft"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-105">
                <Flag className="h-5 w-5" />
              </span>
              <Badge className="shrink-0" tone={difficultyTone(challenge.difficulty)}>{challenge.difficulty}</Badge>
            </div>
            <div className="mt-5 min-w-0 flex-1">
              <p className="text-xs font-extrabold uppercase text-primary">{challenge.category?.name ?? "Challenge"}</p>
              <h2 className="mt-2 break-words text-xl font-extrabold">{challenge.title}</h2>
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">{challenge.description}</p>
            </div>
            <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4">
              <span className="text-sm font-extrabold text-primary">{challenge.baseXp} XP</span>
              <span className="text-sm font-bold text-muted-foreground transition-colors group-hover:text-primary">Open details</span>
            </div>
          </button>
        ))}
        {!filtered.length && (
          <Card className="p-5 md:col-span-2 xl:col-span-3">
            <Flag className="h-8 w-8 text-primary" />
            <h2 className="mt-4 font-bold">No challenges match this filter</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Try another category or difficulty to find more challenges.</p>
          </Card>
        )}
      </div>

      <AnimatePresence>
        {modalChallenge && (
          <motion.div
            className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/70 px-4 py-6 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="challenge-modal-title"
              className="relative w-full max-w-6xl"
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.2 }}
            >
              <Button
                className="absolute right-3 top-3 z-10 bg-surface/90"
                variant="outline"
                size="icon"
                onClick={() => setModalChallenge(null)}
                aria-label="Close challenge details"
                title="Close"
              >
                <X className="h-5 w-5" />
              </Button>
              <ChallengeDetail auth={auth} setAuth={setAuth} challenge={modalChallenge} modal />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ChallengeDetail({
  auth,
  setAuth,
  challenge,
  modal = false,
}: {
  auth: AuthState;
  setAuth: (auth: AuthState) => void;
  challenge?: Challenge;
  modal?: boolean;
}) {
  const [flag, setFlag] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setFlag("");
    setMessage("");
  }, [challenge?.slug]);

  async function submitFlag() {
    if (!challenge || !auth.accessToken) return;
    setSubmitting(true);
    setMessage("");
    try {
      const payload = await api<{ correct: boolean; awardedXp: number }>(`/challenges/${challenge.slug}/submissions`, {
        method: "POST",
        token: auth.accessToken,
        body: JSON.stringify({ flag }),
      });
      setMessage(payload.data.correct ? `Correct flag. Awarded ${payload.data.awardedXp} XP.` : "Incorrect flag. Try again.");
      if (payload.data.correct && auth.user) setAuth({ ...auth, user: { ...auth.user, xp: auth.user.xp + payload.data.awardedXp } });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Flag submission failed.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!challenge) return <StatusPanel tone="info" message="No challenge is published yet." />;

  return (
    <Card className={cn("overflow-hidden", modal ? "max-h-[88vh] overflow-y-auto p-5 sm:p-6 lg:p-8" : "p-6 lg:p-8")}>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="indigo">{challenge.category?.name ?? "Challenge"}</Badge>
            <Badge tone={difficultyTone(challenge.difficulty)}>{challenge.difficulty}</Badge>
            <Badge tone="teal">{challenge.baseXp} XP</Badge>
          </div>
          <h1 id="challenge-modal-title" className="mt-4 break-words pr-12 text-2xl font-extrabold sm:text-3xl">{challenge.title}</h1>
          <p className="mt-3 max-w-3xl leading-7 text-muted-foreground">{challenge.description}</p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {["Find the exposed route", "Identify the trusted header", "Submit the recovered flag", "Document the bypass"].map((item) => (
              <div key={item} className="flex min-h-16 items-center gap-3 rounded-xl border border-border bg-muted/35 p-4">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
                <span className="text-sm font-semibold">{item}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950 p-5 text-slate-100">
            <div className="mb-4 flex items-center gap-2 text-xs text-slate-400">
              <Terminal className="h-4 w-4" />
              request.log
            </div>
            <pre className="overflow-x-auto text-sm leading-7"><code>{`GET /admin HTTP/1.1
Host: lab.trainhack.local
X-Forwarded-For: 127.0.0.1
X-TrainHack-Trace: enabled`}</code></pre>
          </div>
        </div>

        <aside className="space-y-4">
          <AuthCard auth={auth} setAuth={setAuth} />
          <Card className="p-5">
            <h2 className="font-bold">Submit Flag</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Enter the captured flag for this challenge.</p>
            <Input className="mt-4" value={flag} onChange={(event) => setFlag(event.target.value)} placeholder="TH{...}" aria-label="Flag submission" />
            <Button className="mt-3 w-full" disabled={!auth.accessToken || !flag || submitting} onClick={submitFlag}>
              {submitting ? "Submitting..." : "Submit Flag"}
            </Button>
            {message && <p className="mt-3 text-sm font-semibold text-muted-foreground">{message}</p>}
            {!auth.accessToken && <p className="mt-3 text-xs font-semibold text-muted-foreground">Log in to submit a flag.</p>}
          </Card>
          <Card className="p-5">
            <h2 className="font-bold">Helpful Hints</h2>
            {(challenge.hints?.length ? challenge.hints : [{ id: "proxy", title: "Review proxy headers", penaltyPct: 0 }]).map((hint) => (
              <details key={hint.id} className="group mt-3 rounded-xl border border-border p-3">
                <summary className="cursor-pointer text-sm font-semibold">{hint.title}</summary>
                <p className="mt-2 text-sm text-muted-foreground">{hint.content ?? "Use the lab terminal and inspect how the service interprets client identity."}</p>
              </details>
            ))}
          </Card>
        </aside>
      </div>
    </Card>
  );
}

function AuthCard({
  auth,
  setAuth,
  initialMode = "login",
  onModeChange,
  onAuthed,
  lockMode = false,
  defaultEmail = demoCredentials.email,
  defaultPassword = demoCredentials.password,
  submitLabel,
  elevated = false,
  alternateActionLabel,
  onAlternateAction,
  requireAdmin = false,
  headerTitle,
  headerDescription,
}: {
  auth: AuthState;
  setAuth: (auth: AuthState) => void;
  initialMode?: AuthMode;
  onModeChange?: (mode: AuthMode) => void;
  onAuthed?: () => void;
  lockMode?: boolean;
  defaultEmail?: string;
  defaultPassword?: string;
  submitLabel?: string;
  elevated?: boolean;
  alternateActionLabel?: string;
  onAlternateAction?: () => void;
  requireAdmin?: boolean;
  headerTitle?: string;
  headerDescription?: string;
}) {
  const [mode, setModeState] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState(defaultEmail);
  const [username, setUsername] = useState("newlearner");
  const [password, setPassword] = useState(defaultPassword);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setModeState(initialMode);
    setEmail(defaultEmail);
    setPassword(defaultPassword);
  }, [defaultEmail, defaultPassword, initialMode]);

  function setMode(mode: AuthMode) {
    if (lockMode) return;
    setModeState(mode);
    onModeChange?.(mode);
  }

  async function submit() {
    setMessage("");
    if (mode === "register" && password.length < 12) {
      setMessage("Password must be at least 12 characters.");
      return;
    }
    if (mode === "register" && !/^[a-zA-Z0-9_]{3,32}$/.test(username)) {
      setMessage("Username must be 3-32 letters, numbers, or underscores.");
      return;
    }
    try {
      if (mode === "register") {
        await api<User>("/auth/register", {
          method: "POST",
          body: JSON.stringify({ email, username, password, displayName: username }),
        });
      }
      const payload = await api<AuthState>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password, deviceName: "TrainHack UI" }),
      });
      if (requireAdmin && !hasAdminAccess(payload.data.user)) {
        setAuth({ user: null, accessToken: "", refreshToken: "" });
        setMessage("Admin or super admin access is required.");
        return;
      }
      setAuth(payload.data);
      setMessage(mode === "login" ? "Login successful." : "Account created and logged in.");
      onAuthed?.();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Authentication failed.");
    }
  }

  const fieldVariants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.36, ease: [0.22, 1, 0.36, 1] } },
  };

  if (auth.user) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 16, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.48, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}>
      <Card className={cn("overflow-hidden p-5", elevated && "border-primary/20 bg-surface/95 shadow-lift")}>
      {elevated && (
        <motion.div
          className="-mx-5 -mt-5 mb-5 border-b border-border bg-gradient-to-r from-primary/10 via-accent/10 to-transparent px-5 py-4"
          initial={{ backgroundPosition: "0% 50%" }}
          animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          style={{ backgroundSize: "220% 100%" }}
        >
          <h2 className="text-lg font-extrabold tracking-normal">{headerTitle ?? (mode === "login" ? "Sign in securely" : "Create account")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{headerDescription ?? (mode === "login" ? "Use your learner credentials to continue." : "Your progress starts after this step.")}</p>
        </motion.div>
      )}
      {!lockMode && <div className="flex gap-2">
        <Button size="sm" variant={mode === "login" ? "primary" : "outline"} onClick={() => setMode("login")}>Login</Button>
        <Button size="sm" variant={mode === "register" ? "primary" : "outline"} onClick={() => setMode("register")}>Sign Up</Button>
      </div>}
      <motion.div initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}>
      <motion.label className={cn("block", lockMode ? "" : "mt-4")} variants={fieldVariants}>
        <span className="mb-2 block text-xs font-bold uppercase text-muted-foreground">Email</span>
        <span className="relative block transition-transform duration-200 focus-within:scale-[1.01]">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="h-12 pl-10" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" aria-label="Email" />
        </span>
      </motion.label>
      {mode === "register" && (
        <motion.label className="mt-4 block" variants={fieldVariants}>
          <span className="mb-2 block text-xs font-bold uppercase text-muted-foreground">Username</span>
          <span className="block transition-transform duration-200 focus-within:scale-[1.01]">
            <Input className="h-12" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Username" aria-label="Username" />
          </span>
        </motion.label>
      )}
      <motion.label className="mt-4 block" variants={fieldVariants}>
          <span className="mb-2 block text-xs font-bold uppercase text-muted-foreground">Password</span>
          <span className="relative block transition-transform duration-200 focus-within:scale-[1.01]">
            <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="h-12 pl-10" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" type="password" aria-label="Password" />
          </span>
          {mode === "register" && <span className="mt-2 block text-xs font-semibold text-muted-foreground">Use at least 12 characters.</span>}
        </motion.label>
      <motion.div variants={fieldVariants} whileHover={{ y: -2 }} whileTap={{ scale: 0.985 }}>
        <Button className="mt-5 h-12 w-full shadow-lg shadow-primary/20" onClick={submit}>{submitLabel ?? (mode === "login" ? "Login" : "Create Account")}</Button>
      </motion.div>
      {alternateActionLabel && onAlternateAction && (
        <motion.div variants={fieldVariants} whileHover={{ y: -1 }} whileTap={{ scale: 0.99 }}>
          <Button className="mt-3 h-12 w-full" variant="outline" onClick={onAlternateAction}>
            {alternateActionLabel}
          </Button>
        </motion.div>
      )}
      </motion.div>
      {message && <p className="mt-3 flex gap-2 text-sm font-semibold text-red-600"><XCircle className="h-4 w-4" />{message}</p>}
    </Card>
    </motion.div>
  );
}

function LearningPath({ auth, courses }: { auth: AuthState; courses: Course[] }) {
  const [openModule, setOpenModule] = useState("");
  const hasPersonalProgress = Boolean(auth.user && auth.user.xp > 0);

  if (!courses.length) return <StatusPanel tone="info" message="No learning path is published yet." />;
  const totalPaths = courses.length;
  const totalModules = courses.reduce((total, course) => total + course.modules.length, 0);
  const totalMinutes = courses.flatMap((course) => course.modules).flatMap((module) => module.lessons).reduce((total, lesson) => total + lesson.estimatedMinutes, 0);

  return (
    <div className="space-y-6">
      <Card className="p-6 lg:p-8">
        <Badge tone="teal">Interactive roadmaps</Badge>
        <h1 className="mt-4 break-words text-2xl font-extrabold sm:text-3xl">Learning Paths</h1>
        <p className="mt-3 max-w-3xl leading-7 text-muted-foreground">
          Choose from live backend paths covering web security, cloud defense, and binary exploitation.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Metric label="Paths" value={String(totalPaths)} />
          <Metric label="Modules" value={String(totalModules)} />
          <Metric label="Training time" value={`${Math.round(totalMinutes / 60)}h`} />
        </div>
      </Card>

      <div className="grid gap-5">
        {courses.map((course, courseIndex) => {
          const courseMinutes = course.modules.flatMap((module) => module.lessons).reduce((total, lesson) => total + lesson.estimatedMinutes, 0);
          return (
            <Card key={course.slug} className="overflow-hidden">
              <div className="border-b border-border p-5 lg:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <Badge tone={difficultyTone(course.difficulty)}>{course.difficulty}</Badge>
                    <h2 className="mt-3 text-xl font-extrabold">{course.title}</h2>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{course.summary}</p>
                  </div>
                  <div className="min-w-40 rounded-2xl bg-muted/50 p-3 text-sm font-semibold text-muted-foreground">
                    <p>{course.modules.length} modules</p>
                    <p>{Math.round(courseMinutes / 60)}h estimated</p>
                  </div>
                </div>
                <Progress className="mt-5" value={hasPersonalProgress ? Math.min(100, (courseIndex + 1) * 28) : 0} />
              </div>

              <div className="divide-y divide-border">
                {course.modules.map((module, index) => {
                  const state = hasPersonalProgress ? (courseIndex === 0 && index === 0 ? "complete" : index === 0 ? "current" : "available") : "available";
                  return (
                    <div key={module.id} className={cn("p-5 transition-colors hover:bg-muted/35", state === "current" && "bg-primary/5")}>
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-4">
                          <span className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-2xl", state === "complete" && "bg-green-500/10 text-green-600", state === "current" && "bg-primary/10 text-primary", state === "available" && "bg-muted text-muted-foreground")}>
                            {state === "complete" ? <CheckCircle2 className="h-6 w-6" /> : state === "current" ? <Play className="h-5 w-5" /> : <BookOpen className="h-5 w-5" />}
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-muted-foreground">Module {index + 1}</p>
                            <h3 className="text-lg font-bold">{module.title}</h3>
                            {module.summary && <p className="mt-1 text-sm text-muted-foreground">{module.summary}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge tone={state === "complete" ? "green" : state === "current" ? "indigo" : "slate"}>{state}</Badge>
                          <span className="text-sm font-semibold text-muted-foreground">{module.lessons.length} lessons</span>
                          <Button size="sm" variant={openModule === module.id ? "soft" : "primary"} onClick={() => setOpenModule(openModule === module.id ? "" : module.id)}>
                            {openModule === module.id ? "Close" : "Open"}
                          </Button>
                        </div>
                      </div>
                      {openModule === module.id && (
                        <div className="mt-5 grid gap-3 border-t border-border pt-5">
                          {module.lessons.map((lesson) => (
                            <div key={lesson.id} className="flex items-center justify-between gap-3 rounded-xl bg-muted/45 p-3">
                              <span className="text-sm font-semibold">{lesson.title}</span>
                              <Badge tone="teal">{lesson.estimatedMinutes}m</Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
