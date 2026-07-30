import React, { useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import { AnimatePresence, motion } from "framer-motion";
import {
  Award,
  Bell,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  CircleDot,
  Command,
  Flag,
  Globe2,
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
} from "lucide-react";
import { Badge, Button, Card, Input, Progress, SectionHeader } from "./components/ui";
import { cn } from "./lib/utils";
import "./index.css";

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

const progressAreas = [
  { name: "Web Security", progress: 72, difficulty: "Intermediate", eta: "4h 20m", icon: Globe2 },
  { name: "Reverse Engineering", progress: 38, difficulty: "Hard", eta: "8h 10m", icon: KeyRound },
  { name: "Cryptography", progress: 64, difficulty: "Beginner", eta: "3h 45m", icon: Lock },
  { name: "Forensics", progress: 51, difficulty: "Intermediate", eta: "5h 05m", icon: Search },
  { name: "Binary Exploitation", progress: 27, difficulty: "Hard", eta: "10h 15m", icon: Terminal },
  { name: "OSINT", progress: 84, difficulty: "Beginner", eta: "1h 30m", icon: CircleDot },
];

const challenges = [
  { title: "Header Mirage", category: "Web Security", difficulty: "Easy", xp: 180, status: "In progress" },
  { title: "Packed Signal", category: "Reverse Engineering", difficulty: "Hard", xp: 420, status: "Unsolved" },
  { title: "Cipher Orchard", category: "Cryptography", difficulty: "Medium", xp: 260, status: "Solved" },
];

const labs = [
  { name: "Apollo", os: "Ubuntu", difficulty: "Medium", status: "Running", ip: "10.10.14.28" },
  { name: "Mica", os: "Windows", difficulty: "Hard", status: "Paused", ip: "10.10.14.44" },
];

const leaders = [
  ["1", "nixwave", "18,920 XP", "JP"],
  ["2", "ciphernova", "17,440 XP", "US"],
  ["3", "rootkind", "16,850 XP", "DE"],
  ["4", "packetlane", "15,780 XP", "PH"],
  ["5", "hashcraft", "14,990 XP", "SG"],
];

const activities = [
  "Completed Header Mirage",
  "Earned Web Specialist badge",
  "Unlocked Binary Exploitation path",
  "Received Practical Forensics certificate",
];

const modules = [
  { title: "Recon Basics", state: "complete", time: "35m" },
  { title: "Input Validation", state: "complete", time: "50m" },
  { title: "Auth Bypass", state: "current", time: "1h 15m" },
  { title: "Server-Side Requests", state: "locked", time: "1h 40m" },
  { title: "Final CTF Sprint", state: "locked", time: "2h" },
];

function App() {
  const [dark, setDark] = useState(false);
  const [view, setView] = useState<"dashboard" | "challenge" | "path">("dashboard");

  useMemo(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex">
        <Sidebar view={view} setView={setView} />
        <main className="min-w-0 flex-1">
          <Topbar dark={dark} setDark={setDark} />
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22 }}
              className="mx-auto max-w-[1480px] px-5 py-6 lg:px-8"
            >
              {view === "dashboard" && <Dashboard setView={setView} />}
              {view === "challenge" && <ChallengeDetail />}
              {view === "path" && <LearningPath />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

function Sidebar({ view, setView }: { view: string; setView: (view: "dashboard" | "challenge" | "path") => void }) {
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
          const active =
            (label === "Dashboard" && view === "dashboard") ||
            (label === "Challenges" && view === "challenge") ||
            (label === "Learning Paths" && view === "path");
          return (
            <button
              key={label}
              onClick={() =>
                label === "Challenges" ? setView("challenge") : label === "Learning Paths" ? setView("path") : setView("dashboard")
              }
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

function Topbar({ dark, setDark }: { dark: boolean; setDark: (dark: boolean) => void }) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/90 px-5 py-4 backdrop-blur lg:px-8">
      <div className="mx-auto flex max-w-[1480px] items-center gap-3">
        <div className="relative max-w-xl flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-10" placeholder="Search challenges, labs, paths..." aria-label="Search" />
        </div>
        <Button variant="outline" size="sm" className="hidden sm:inline-flex">
          <Command className="h-4 w-4" />
          K
        </Button>
        <Button variant="soft" size="sm">
          <Sparkles className="h-4 w-4" />
          12,480 XP
        </Button>
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => setDark(!dark)} aria-label="Toggle theme">
          {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
        <button className="flex items-center gap-2 rounded-xl p-1 pr-2 hover:bg-muted" aria-label="Open user menu">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent/15 text-sm font-bold text-teal-700">AR</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    </header>
  );
}

function Dashboard({ setView }: { setView: (view: "dashboard" | "challenge" | "path") => void }) {
  return (
    <div className="space-y-6">
      <Card className="overflow-hidden p-6 lg:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr] lg:items-center">
          <div>
            <Badge tone="teal">7 day learning streak</Badge>
            <h1 className="mt-4 max-w-2xl text-3xl font-extrabold tracking-normal sm:text-4xl">Welcome back, Ari. Your web security path is ready.</h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
              Continue the current module, launch an active machine, or submit your next flag from a focused workspace.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button onClick={() => setView("path")}>
                <Play className="h-4 w-4" />
                Continue Learning
              </Button>
              <Button variant="outline" onClick={() => setView("challenge")}>
                <Flag className="h-4 w-4" />
                Open Challenge
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Metric label="XP earned" value="+1,240" />
            <Metric label="Current rank" value="#42" />
            <Metric label="Streak" value="7 days" />
            <Metric label="Path progress" value="68%" />
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Flag} label="Challenges Completed" value="126" delta="+8 this week" />
        <StatCard icon={MonitorDot} label="Active Machines" value="2" delta="1 expiring soon" />
        <StatCard icon={GraduationCap} label="Learning Progress" value="68%" delta="Web Security path" />
        <StatCard icon={Star} label="Total XP" value="12,480" delta="Top 4%" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.9fr]">
        <LearningProgress />
        <RecentChallenges setView={setView} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.85fr_0.85fr]">
        <ActiveLabs />
        <Leaderboard />
        <ActivityFeed />
      </div>
    </div>
  );
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

function LearningProgress() {
  return (
    <section>
      <SectionHeader title="Learning Progress" action={<Button variant="ghost" size="sm">View all</Button>} />
      <div className="grid gap-4 md:grid-cols-2">
        {progressAreas.map((area) => (
          <Card key={area.name} className="p-5 hover:-translate-y-0.5 hover:shadow-soft">
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent/12 text-teal-700 dark:text-teal-200">
                  <area.icon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-bold">{area.name}</h3>
                  <p className="text-sm text-muted-foreground">{area.eta} remaining</p>
                </div>
              </div>
              <Badge tone={area.difficulty === "Hard" ? "red" : area.difficulty === "Intermediate" ? "amber" : "green"}>{area.difficulty}</Badge>
            </div>
            <Progress value={area.progress} />
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm font-semibold text-muted-foreground">{area.progress}% complete</span>
              <Button variant="soft" size="sm">Continue</Button>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}

function RecentChallenges({ setView }: { setView: (view: "dashboard" | "challenge" | "path") => void }) {
  return (
    <section>
      <SectionHeader title="Recent Challenges" action={<Button variant="ghost" size="sm">Browse</Button>} />
      <Card className="divide-y divide-border overflow-hidden">
        {challenges.map((challenge) => (
          <div key={challenge.title} className="p-5 transition-colors hover:bg-muted/45">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-bold">{challenge.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{challenge.category}</p>
              </div>
              <Badge tone={challenge.difficulty === "Hard" ? "red" : challenge.difficulty === "Medium" ? "amber" : "green"}>{challenge.difficulty}</Badge>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-primary">{challenge.xp} XP</span>
              <div className="flex items-center gap-2">
                <span className="hidden text-sm text-muted-foreground sm:inline">{challenge.status}</span>
                <Button size="sm" onClick={() => setView("challenge")}>Solve</Button>
              </div>
            </div>
          </div>
        ))}
      </Card>
    </section>
  );
}

function ActiveLabs() {
  return (
    <section>
      <SectionHeader title="Active Labs" />
      <div className="space-y-4">
        {labs.map((lab) => (
          <Card key={lab.name} className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold">{lab.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{lab.os} · {lab.ip}</p>
              </div>
              <Badge tone={lab.status === "Running" ? "green" : "slate"}>{lab.status}</Badge>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <Badge tone={lab.difficulty === "Hard" ? "red" : "amber"}>{lab.difficulty}</Badge>
              <Button variant="outline" size="sm">Connect</Button>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}

function Leaderboard() {
  return (
    <section>
      <SectionHeader title="Leaderboard" />
      <Card className="divide-y divide-border overflow-hidden">
        {leaders.map(([rank, name, xp, country]) => (
          <div key={name} className="flex items-center gap-3 p-4">
            <span className="w-6 text-sm font-bold text-primary">#{rank}</span>
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-muted text-sm font-bold">{name.slice(0, 2).toUpperCase()}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{name}</p>
              <p className="text-xs text-muted-foreground">{country}</p>
            </div>
            <span className="text-sm font-semibold">{xp}</span>
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

function ChallengeDetail() {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        Dashboard / Challenges / <span className="font-semibold text-foreground">Header Mirage</span>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <Card className="p-6 lg:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Badge tone="indigo">Web Security</Badge>
              <h1 className="mt-4 text-3xl font-extrabold">Header Mirage</h1>
              <p className="mt-3 max-w-3xl leading-7 text-muted-foreground">
                Inspect a misconfigured gateway, trace its forwarding behavior, and recover the hidden training flag from trusted request metadata.
              </p>
            </div>
            <div className="flex gap-2">
              <Badge tone="green">Easy</Badge>
              <Badge tone="teal">180 XP</Badge>
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
          <Card className="p-5">
            <h2 className="font-bold">Submit Flag</h2>
            <Input className="mt-4" placeholder="TH{...}" aria-label="Flag submission" />
            <Button className="mt-3 w-full">Submit Answer</Button>
          </Card>
          <Card className="p-5">
            <h2 className="font-bold">Helpful Hints</h2>
            {["Review proxy headers", "Compare local and remote responses", "Check gateway trust boundaries"].map((hint) => (
              <details key={hint} className="group mt-3 rounded-xl border border-border p-3">
                <summary className="cursor-pointer text-sm font-semibold">{hint}</summary>
                <p className="mt-2 text-sm text-muted-foreground">Use the lab terminal and inspect how the service interprets client identity.</p>
              </details>
            ))}
          </Card>
          <Card className="p-5">
            <h2 className="font-bold">Related Resources</h2>
            <div className="mt-4 space-y-3">
              {["HTTP proxy basics", "Access control checklist", "Secure header handling"].map((resource) => (
                <button key={resource} className="flex w-full items-center gap-3 rounded-xl p-2 text-left text-sm font-semibold hover:bg-muted">
                  <BookOpen className="h-4 w-4 text-primary" />
                  {resource}
                </button>
              ))}
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function LearningPath() {
  return (
    <div className="space-y-6">
      <Card className="p-6 lg:p-8">
        <Badge tone="teal">Interactive roadmap</Badge>
        <h1 className="mt-4 text-3xl font-extrabold">Web Security Foundations</h1>
        <p className="mt-3 max-w-3xl leading-7 text-muted-foreground">
          A connected progression of lessons, labs, and practical CTF checkpoints designed for confident, repeatable growth.
        </p>
        <div className="mt-6 max-w-2xl">
          <Progress value={58} />
          <div className="mt-3 flex justify-between text-sm font-semibold text-muted-foreground">
            <span>58% complete</span>
            <span>6h 20m remaining</span>
          </div>
        </div>
      </Card>
      <div className="grid gap-4">
        {modules.map((module, index) => (
          <Card key={module.title} className={cn("p-5", module.state === "current" && "border-primary shadow-lift")}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <span className={cn("grid h-12 w-12 place-items-center rounded-2xl", module.state === "complete" && "bg-green-500/10 text-green-600", module.state === "current" && "bg-primary/10 text-primary", module.state === "locked" && "bg-muted text-muted-foreground")}>
                  {module.state === "complete" ? <CheckCircle2 className="h-6 w-6" /> : module.state === "current" ? <Play className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
                </span>
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">Module {index + 1}</p>
                  <h2 className="text-lg font-bold">{module.title}</h2>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge tone={module.state === "locked" ? "slate" : module.state === "current" ? "indigo" : "green"}>{module.state}</Badge>
                <span className="text-sm font-semibold text-muted-foreground">{module.time}</span>
                <Button size="sm" variant={module.state === "locked" ? "outline" : "primary"} disabled={module.state === "locked"}>
                  {module.state === "locked" ? "Locked" : "Open"}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
