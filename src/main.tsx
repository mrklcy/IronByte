import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import { AnimatePresence, motion } from "framer-motion";
import {
  Award,
  Bell,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Command,
  Flag,
  GraduationCap,
  HardDrive,
  Home,
  KeyRound,
  Layers3,
  Lock,
  MonitorDot,
  Moon,
  Play,
  Search,
  Settings,
  Shield,
  Sparkles,
  Star,
  Sun,
  Terminal,
  Trophy,
  Users,
  XCircle,
} from "lucide-react";
import { Badge, Button, Card, Input, Progress, SectionHeader } from "./components/ui";
import { cn } from "./lib/utils";
import "./index.css";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api/v1";
const demoCredentials = { email: "ari@trainhack.local", password: "TrainHack123!" };

type View = "dashboard" | "challenge" | "path";
type Difficulty = "BEGINNER" | "EASY" | "MEDIUM" | "HARD" | "EXPERT";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
  meta?: { total?: number };
};

type User = {
  id: string;
  email: string;
  username: string;
  displayName?: string | null;
  xp: number;
  level: number;
};

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
  slug: string;
  name: string;
  os: string;
  description: string;
  difficulty: Difficulty;
  timeLimitMinutes: number;
  category?: { name: string };
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

const navItems = [
  ["Dashboard", Home],
  ["Challenges", Flag],
  ["Learning Paths", Layers3],
  ["Machines", MonitorDot],
  ["Labs", HardDrive],
  ["Leaderboard", Trophy],
  ["Certificates", Award],
  ["Community", Users],
  ["Settings", Settings],
] as const;

const activities = [
  "Completed Header Mirage",
  "Earned Web Specialist badge",
  "Unlocked Binary Exploitation path",
  "Received Practical Forensics certificate",
];

function difficultyTone(difficulty?: Difficulty) {
  if (difficulty === "HARD" || difficulty === "EXPERT") return "red";
  if (difficulty === "MEDIUM") return "amber";
  return "green";
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
  const payload = (await response.json()) as ApiResponse<T>;
  if (!response.ok || !payload.success) throw new Error(payload.message || "Request failed.");
  return payload;
}

function App() {
  const [dark, setDark] = useState(false);
  const [view, setView] = useState<View>("dashboard");
  const [search, setSearch] = useState("");
  const [selectedChallenge, setSelectedChallenge] = useState("header-mirage");
  const [data, setData] = useState<AppData>({ challenges: [], courses: [], labs: [], leaderboard: [] });
  const [auth, setAuth] = useState<AuthState>(() => {
    const stored = localStorage.getItem("trainhack-auth");
    return stored ? JSON.parse(stored) : { user: null, accessToken: "", refreshToken: "" };
  });
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  useMemo(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  useEffect(() => {
    localStorage.setItem("trainhack-auth", JSON.stringify(auth));
  }, [auth]);

  useEffect(() => {
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
  }, [search]);

  useEffect(() => {
    if (!auth.accessToken) return;
    api<User>("/users/me", { token: auth.accessToken })
      .then((payload) => setAuth((current) => ({ ...current, user: payload.data })))
      .catch(() => setAuth({ user: null, accessToken: "", refreshToken: "" }));
  }, [auth.accessToken]);

  const challenge = data.challenges.find((item) => item.slug === selectedChallenge) ?? data.challenges[0];
  const course = data.courses[0];

  function openChallenge(slug?: string) {
    if (slug) setSelectedChallenge(slug);
    setView("challenge");
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex">
        <Sidebar view={view} setView={setView} />
        <main className="min-w-0 flex-1">
          <Topbar dark={dark} setDark={setDark} auth={auth} setAuth={setAuth} search={search} setSearch={setSearch} />
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22 }}
              className="mx-auto max-w-[1480px] px-5 py-6 lg:px-8"
            >
              {notice && <StatusPanel tone="error" message={notice} />}
              {loading && <StatusPanel tone="info" message="Loading platform data..." />}
              {view === "dashboard" && <Dashboard auth={auth} data={data} openChallenge={openChallenge} setView={setView} />}
              {view === "challenge" && <ChallengeDetail auth={auth} setAuth={setAuth} challenge={challenge} />}
              {view === "path" && <LearningPath course={course} />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

function StatusPanel({ tone, message }: { tone: "info" | "error"; message: string }) {
  return (
    <div className={cn("mb-4 rounded-xl border px-4 py-3 text-sm font-semibold", tone === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-border bg-muted text-muted-foreground")}>
      {message}
    </div>
  );
}

function Sidebar({ view, setView }: { view: string; setView: (view: View) => void }) {
  return (
    <aside className="sticky top-0 hidden h-screen w-72 shrink-0 border-r border-border bg-surface px-4 py-5 lg:block">
      <button onClick={() => setView("dashboard")} className="mb-8 flex w-full items-center gap-3 rounded-2xl px-2 text-left">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-white shadow-lift">
          <Shield className="h-6 w-6" />
        </span>
        <span>
          <span className="block text-lg font-extrabold">TrainHack</span>
          <span className="text-xs font-medium text-muted-foreground">Skill-first CTF training</span>
        </span>
      </button>
      <nav className="space-y-1" aria-label="Primary navigation">
        {navItems.map(([label, Icon]) => {
          const target = label === "Challenges" ? "challenge" : label === "Learning Paths" ? "path" : "dashboard";
          const active = view === target;
          return (
            <button
              key={label}
              onClick={() => setView(target)}
              className={cn(
                "flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-muted-foreground transition-colors",
                active && "bg-primary/10 text-primary",
                !active && "hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

function Topbar({
  dark,
  setDark,
  auth,
  setAuth,
  search,
  setSearch,
}: {
  dark: boolean;
  setDark: (dark: boolean) => void;
  auth: AuthState;
  setAuth: (auth: AuthState) => void;
  search: string;
  setSearch: (search: string) => void;
}) {
  const searchRef = useRef<HTMLInputElement>(null);

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/90 px-5 py-4 backdrop-blur lg:px-8">
      <div className="mx-auto flex max-w-[1480px] items-center gap-3">
        <div className="relative max-w-xl flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input ref={searchRef} className="pl-10" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search challenges, labs, paths..." aria-label="Search" />
        </div>
        <Button variant="outline" size="sm" className="hidden sm:inline-flex" onClick={() => searchRef.current?.focus()}>
          <Command className="h-4 w-4" />
          K
        </Button>
        <Button variant="soft" size="sm">
          <Sparkles className="h-4 w-4" />
          {auth.user ? `${auth.user.xp.toLocaleString()} XP` : "Guest"}
        </Button>
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => setDark(!dark)} aria-label="Toggle theme">
          {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
        {auth.user ? (
          <Button variant="outline" size="sm" onClick={() => setAuth({ user: null, accessToken: "", refreshToken: "" })}>
            {auth.user.username}
            <ChevronDown className="h-4 w-4" />
          </Button>
        ) : (
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent/15 text-sm font-bold text-teal-700">GH</span>
        )}
      </div>
    </header>
  );
}

function Dashboard({ auth, data, openChallenge, setView }: { auth: AuthState; data: AppData; openChallenge: (slug?: string) => void; setView: (view: View) => void }) {
  const solved = auth.user?.xp ? Math.max(1, Math.floor(auth.user.xp / 180)) : 0;
  const pathProgress = data.courses[0]?.modules.length ? Math.min(100, data.courses[0].modules.length * 22) : 0;

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden p-6 lg:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr] lg:items-center">
          <div>
            <Badge tone="teal">{auth.user ? `${auth.user.level} level learner` : "Live platform connection"}</Badge>
            <h1 className="mt-4 max-w-2xl text-3xl font-extrabold tracking-normal sm:text-4xl">
              Welcome {auth.user?.displayName ?? auth.user?.username ?? "back"}. Your training workspace is online.
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
              Continue the current path, inspect seeded labs, view rankings, or submit a flag through the backend API.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button onClick={() => setView("path")}>
                <Play className="h-4 w-4" />
                Continue Learning
              </Button>
              <Button variant="outline" onClick={() => openChallenge()}>
                <Flag className="h-4 w-4" />
                Open Challenge
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Metric label="XP earned" value={(auth.user?.xp ?? 0).toLocaleString()} />
            <Metric label="Current rank" value={rankFor(auth.user, data.leaderboard)} />
            <Metric label="Challenges" value={String(data.challenges.length)} />
            <Metric label="Path progress" value={`${pathProgress}%`} />
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Flag} label="Challenges Completed" value={String(solved)} delta={`${data.challenges.length} available`} />
        <StatCard icon={MonitorDot} label="Active Machines" value={String(data.labs.length)} delta="Seeded lab inventory" />
        <StatCard icon={GraduationCap} label="Learning Paths" value={String(data.courses.length)} delta={data.courses[0]?.title ?? "No published paths"} />
        <StatCard icon={Star} label="Total XP" value={(auth.user?.xp ?? 0).toLocaleString()} delta={auth.user ? `Level ${auth.user.level}` : "Sign in to track"} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.9fr]">
        <LearningProgress courses={data.courses} setView={setView} />
        <RecentChallenges challenges={data.challenges} openChallenge={openChallenge} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.85fr_0.85fr]">
        <ActiveLabs labs={data.labs} />
        <Leaderboard leaders={data.leaderboard} />
        <ActivityFeed />
      </div>
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
    <div className="rounded-2xl border border-border bg-muted/45 p-4">
      <div className="text-sm font-medium text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-extrabold">{value}</div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, delta }: { icon: typeof Flag; label: string; value: string; delta: string }) {
  return (
    <Card className="p-5 hover:-translate-y-0.5 hover:shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-extrabold">{value}</p>
          <p className="mt-2 text-sm text-muted-foreground">{delta}</p>
        </div>
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </Card>
  );
}

function LearningProgress({ courses, setView }: { courses: Course[]; setView: (view: View) => void }) {
  return (
    <section>
      <SectionHeader title="Learning Progress" action={<Button variant="ghost" size="sm" onClick={() => setView("path")}>View all</Button>} />
      <div className="grid gap-4 md:grid-cols-2">
        {courses.map((course) => (
          <Card key={course.slug} className="p-5 hover:-translate-y-0.5 hover:shadow-soft">
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent/12 text-teal-700 dark:text-teal-200">
                  <BookOpen className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-bold">{course.title}</h3>
                  <p className="text-sm text-muted-foreground">{course.summary}</p>
                </div>
              </div>
              <Badge tone={difficultyTone(course.difficulty)}>{course.difficulty}</Badge>
            </div>
            <Progress value={Math.min(100, course.modules.length * 22)} />
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm font-semibold text-muted-foreground">{course.modules.length} modules</span>
              <Button variant="soft" size="sm" onClick={() => setView("path")}>Continue</Button>
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
        {challenges.map((challenge) => (
          <div key={challenge.slug} className="p-5 transition-colors hover:bg-muted/45">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-bold">{challenge.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{challenge.category?.name ?? "Challenge"}</p>
              </div>
              <Badge tone={difficultyTone(challenge.difficulty)}>{challenge.difficulty}</Badge>
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

function ActiveLabs({ labs }: { labs: Lab[] }) {
  const [connectedLab, setConnectedLab] = useState("");

  return (
    <section>
      <SectionHeader title="Active Labs" />
      <div className="space-y-4">
        {labs.map((lab) => (
          <Card key={lab.slug} className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold">{lab.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{lab.os} | {lab.timeLimitMinutes} minutes</p>
              </div>
              <Badge tone={connectedLab === lab.slug ? "teal" : "green"}>{connectedLab === lab.slug ? "Connected" : "Available"}</Badge>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <Badge tone={difficultyTone(lab.difficulty)}>{lab.difficulty}</Badge>
              <Button variant="outline" size="sm" onClick={() => setConnectedLab(connectedLab === lab.slug ? "" : lab.slug)}>
                {connectedLab === lab.slug ? "Disconnect" : "Connect"}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}

function Leaderboard({ leaders }: { leaders: User[] }) {
  return (
    <section>
      <SectionHeader title="Leaderboard" />
      <Card className="divide-y divide-border overflow-hidden">
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
  return (
    <section>
      <SectionHeader title="Activity Feed" />
      <Card className="p-5">
        <div className="space-y-5">
          {activities.map((activity, index) => (
            <div key={activity} className="flex gap-3">
              <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent/12 text-teal-700">
                <CheckCircle2 className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold">{activity}</p>
                <p className="mt-1 text-xs text-muted-foreground">{index + 1}h ago</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}

function ChallengeDetail({ auth, setAuth, challenge }: { auth: AuthState; setAuth: (auth: AuthState) => void; challenge?: Challenge }) {
  const [flag, setFlag] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        Dashboard / Challenges / <span className="font-semibold text-foreground">{challenge.title}</span>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <Card className="p-6 lg:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Badge tone="indigo">{challenge.category?.name ?? "Challenge"}</Badge>
              <h1 className="mt-4 text-3xl font-extrabold">{challenge.title}</h1>
              <p className="mt-3 max-w-3xl leading-7 text-muted-foreground">{challenge.description}</p>
            </div>
            <div className="flex gap-2">
              <Badge tone={difficultyTone(challenge.difficulty)}>{challenge.difficulty}</Badge>
              <Badge tone="teal">{challenge.baseXp} XP</Badge>
            </div>
          </div>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {["Find the exposed route", "Identify the trusted header", "Submit the recovered flag", "Document the bypass"].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-2xl border border-border bg-muted/35 p-4">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="text-sm font-semibold">{item}</span>
              </div>
            ))}
          </div>
          <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-950 p-5 text-slate-100">
            <div className="mb-4 flex items-center gap-2 text-xs text-slate-400">
              <Terminal className="h-4 w-4" />
              request.log
            </div>
            <pre className="overflow-x-auto text-sm leading-7"><code>{`GET /admin HTTP/1.1
Host: lab.trainhack.local
X-Forwarded-For: 127.0.0.1
X-TrainHack-Trace: enabled`}</code></pre>
          </div>
        </Card>
        <aside className="space-y-5">
          <AuthCard auth={auth} setAuth={setAuth} />
          <Card className="p-5">
            <h2 className="font-bold">Submit Flag</h2>
            <Input className="mt-4" value={flag} onChange={(event) => setFlag(event.target.value)} placeholder="TH{...}" aria-label="Flag submission" />
            <Button className="mt-3 w-full" disabled={!auth.accessToken || !flag || submitting} onClick={submitFlag}>
              Submit Answer
            </Button>
            {message && <p className="mt-3 text-sm font-semibold text-muted-foreground">{message}</p>}
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
    </div>
  );
}

function AuthCard({ auth, setAuth }: { auth: AuthState; setAuth: (auth: AuthState) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState(demoCredentials.email);
  const [username, setUsername] = useState("newlearner");
  const [password, setPassword] = useState(demoCredentials.password);
  const [message, setMessage] = useState("");

  async function submit() {
    setMessage("");
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
      setAuth(payload.data);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Authentication failed.");
    }
  }

  if (auth.user) {
    return (
      <Card className="p-5">
        <h2 className="font-bold">{auth.user.displayName ?? auth.user.username}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{auth.user.email}</p>
        <Button className="mt-4 w-full" variant="outline" onClick={() => setAuth({ user: null, accessToken: "", refreshToken: "" })}>
          Logout
        </Button>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <div className="flex gap-2">
        <Button size="sm" variant={mode === "login" ? "primary" : "outline"} onClick={() => setMode("login")}>Login</Button>
        <Button size="sm" variant={mode === "register" ? "primary" : "outline"} onClick={() => setMode("register")}>Register</Button>
      </div>
      <Input className="mt-4" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" aria-label="Email" />
      {mode === "register" && <Input className="mt-3" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Username" aria-label="Username" />}
      <Input className="mt-3" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" type="password" aria-label="Password" />
      <Button className="mt-3 w-full" onClick={submit}>{mode === "login" ? "Login" : "Create Account"}</Button>
      {message && <p className="mt-3 flex gap-2 text-sm font-semibold text-red-600"><XCircle className="h-4 w-4" />{message}</p>}
    </Card>
  );
}

function LearningPath({ course }: { course?: Course }) {
  const [openModule, setOpenModule] = useState("");

  if (!course) return <StatusPanel tone="info" message="No learning path is published yet." />;
  const totalMinutes = course.modules.flatMap((module) => module.lessons).reduce((total, lesson) => total + lesson.estimatedMinutes, 0);

  return (
    <div className="space-y-6">
      <Card className="p-6 lg:p-8">
        <Badge tone="teal">Interactive roadmap</Badge>
        <h1 className="mt-4 text-3xl font-extrabold">{course.title}</h1>
        <p className="mt-3 max-w-3xl leading-7 text-muted-foreground">{course.summary}</p>
        <div className="mt-6 max-w-2xl">
          <Progress value={Math.min(100, course.modules.length * 22)} />
          <div className="mt-3 flex justify-between text-sm font-semibold text-muted-foreground">
            <span>{course.modules.length} modules</span>
            <span>{Math.round(totalMinutes / 60)}h remaining</span>
          </div>
        </div>
      </Card>
      <div className="grid gap-4">
        {course.modules.map((module, index) => {
          const state = index === 0 ? "complete" : index === 1 ? "current" : "locked";
          return (
            <Card key={module.id} className={cn("p-5", state === "current" && "border-primary shadow-lift")}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <span className={cn("grid h-12 w-12 place-items-center rounded-2xl", state === "complete" && "bg-green-500/10 text-green-600", state === "current" && "bg-primary/10 text-primary", state === "locked" && "bg-muted text-muted-foreground")}>
                    {state === "complete" ? <CheckCircle2 className="h-6 w-6" /> : state === "current" ? <Play className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground">Module {index + 1}</p>
                    <h2 className="text-lg font-bold">{module.title}</h2>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone={state === "locked" ? "slate" : state === "current" ? "indigo" : "green"}>{state}</Badge>
                  <span className="text-sm font-semibold text-muted-foreground">{module.lessons[0]?.estimatedMinutes ?? 30}m</span>
                  <Button size="sm" variant={state === "locked" ? "outline" : openModule === module.id ? "soft" : "primary"} disabled={state === "locked"} onClick={() => setOpenModule(module.id)}>
                    {state === "locked" ? "Locked" : openModule === module.id ? "Opened" : "Open"}
                  </Button>
                </div>
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
    <App />
  </React.StrictMode>,
);
