import { PrismaClient, RoleName } from "@prisma/client";
import argon2 from "argon2";
import { permissions } from "../src/constants/roles.js";
import { sha256 } from "../src/utils/crypto.js";

const prisma = new PrismaClient();

const rolePermissions: Record<RoleName, string[]> = {
  GUEST: [],
  STUDENT: [permissions.contentRead, permissions.labsUse, permissions.ctfSubmit],
  INSTRUCTOR: [permissions.contentRead, permissions.contentManage, permissions.labsUse, permissions.ctfSubmit],
  MODERATOR: [permissions.contentRead, permissions.ctfSubmit, permissions.usersRead],
  ADMINISTRATOR: Object.values(permissions),
};

const learningPaths = [
  {
    category: { slug: "web-security", name: "Web Security", description: "Foundations for modern web exploitation and defense." },
    slug: "web-security-foundations",
    title: "Web Security Foundations",
    summary: "Build practical confidence with recon, validation, auth, and SSRF.",
    description: "A connected path of lessons, labs, and CTF checkpoints for web app security.",
    difficulty: "BEGINNER" as const,
    modules: [
      {
        title: "Recon Basics",
        summary: "Map routes, headers, and app behavior before touching payloads.",
        lessons: [
          { title: "HTTP Surface Mapping", content: "Enumerate routes, methods, status codes, and interesting headers.", estimatedMinutes: 30 },
          { title: "Technology Fingerprinting", content: "Identify frameworks, proxies, and auth boundaries from observable behavior.", estimatedMinutes: 35 },
        ],
      },
      {
        title: "Input Validation",
        summary: "Spot validation gaps before they become bugs.",
        lessons: [
          { title: "Server-Side Validation Patterns", content: "Compare client hints with backend enforcement and schema failures.", estimatedMinutes: 40 },
          { title: "Payload Shaping", content: "Build compact test cases for strings, numbers, JSON, and nested objects.", estimatedMinutes: 45 },
        ],
      },
      {
        title: "Auth Bypass",
        summary: "Reason about trust boundaries, sessions, and identity signals.",
        lessons: [
          { title: "Session Flow Review", content: "Trace login, refresh, logout, and role checks across the stack.", estimatedMinutes: 50 },
          { title: "Trusted Header Pitfalls", content: "Understand why reverse-proxy metadata must not become authorization.", estimatedMinutes: 45 },
        ],
      },
    ],
  },
  {
    category: { slug: "cloud-defense", name: "Cloud Defense", description: "Practical cloud identity, storage, and logging skills." },
    slug: "cloud-defense-operator",
    title: "Cloud Defense Operator",
    summary: "Investigate identity drift, public storage, weak service policies, and noisy logs.",
    description: "A blue-team path for analysts who need hands-on cloud investigation practice.",
    difficulty: "MEDIUM" as const,
    modules: [
      {
        title: "Identity Baselines",
        summary: "Review users, roles, service accounts, and permission boundaries.",
        lessons: [
          { title: "Least Privilege Review", content: "Identify overbroad roles and dangerous inherited permissions.", estimatedMinutes: 45 },
          { title: "Key Hygiene", content: "Find stale tokens, unmanaged keys, and risky automation accounts.", estimatedMinutes: 35 },
        ],
      },
      {
        title: "Storage Exposure",
        summary: "Validate bucket policies and object visibility.",
        lessons: [
          { title: "Public Access Triage", content: "Classify storage findings by reachability and data sensitivity.", estimatedMinutes: 40 },
          { title: "Evidence Packaging", content: "Write clean remediation notes with reproduction steps.", estimatedMinutes: 30 },
        ],
      },
      {
        title: "Detection Workflows",
        summary: "Turn suspicious telemetry into reliable alerts.",
        lessons: [
          { title: "Log Query Design", content: "Build targeted detections without flooding responders.", estimatedMinutes: 50 },
          { title: "Incident Timeline", content: "Reconstruct actions from auth, network, and storage events.", estimatedMinutes: 55 },
        ],
      },
    ],
  },
  {
    category: { slug: "binary-exploitation", name: "Binary Exploitation", description: "Memory safety, reversing, and exploit development basics." },
    slug: "binary-exploitation-starter",
    title: "Binary Exploitation Starter",
    summary: "Learn stack layout, unsafe input, mitigations, and debugger-driven reasoning.",
    description: "A beginner-friendly exploit development path with short labs and guided checkpoints.",
    difficulty: "EASY" as const,
    modules: [
      {
        title: "Process Anatomy",
        summary: "Understand stack, heap, registers, and calling conventions.",
        lessons: [
          { title: "Reading a Crash", content: "Use debugger output to identify input control and crash location.", estimatedMinutes: 35 },
          { title: "Stack Frames", content: "Trace function calls, saved return pointers, and local buffers.", estimatedMinutes: 45 },
        ],
      },
      {
        title: "Mitigation Awareness",
        summary: "Recognize NX, canaries, PIE, and ASLR in practice.",
        lessons: [
          { title: "Checksec Basics", content: "Interpret binary hardening signals and adjust exploit strategy.", estimatedMinutes: 30 },
          { title: "Controlled Proofs", content: "Build repeatable inputs that prove impact without unnecessary damage.", estimatedMinutes: 50 },
        ],
      },
    ],
  },
];

const labCatalog = [
  { category: { slug: "web-security", name: "Web Security" }, slug: "apollo", name: "Apollo Gateway", os: "Ubuntu 22.04", description: "Reverse proxy header analysis with a small Express service behind Nginx.", difficulty: "MEDIUM" as const, timeLimitMinutes: 90 },
  { category: { slug: "windows-enterprise", name: "Windows Enterprise" }, slug: "mica", name: "Mica Workstation", os: "Windows Server 2022", description: "Service enumeration, local policy review, and weak credential hygiene.", difficulty: "HARD" as const, timeLimitMinutes: 120 },
  { category: { slug: "linux-privilege", name: "Linux Privilege" }, slug: "ember", name: "Ember Shell", os: "Debian 12", description: "Find writable service paths, inspect sudo rules, and capture a local proof.", difficulty: "EASY" as const, timeLimitMinutes: 75 },
  { category: { slug: "cloud-defense", name: "Cloud Defense" }, slug: "skyline", name: "Skyline Storage", os: "Cloud Lab", description: "Audit public object storage, stale access keys, and event logs.", difficulty: "MEDIUM" as const, timeLimitMinutes: 100 },
  { category: { slug: "network-analysis", name: "Network Analysis" }, slug: "packet-forge", name: "Packet Forge", os: "Kali Rolling", description: "Analyze packet captures and recover suspicious DNS and HTTP artifacts.", difficulty: "BEGINNER" as const, timeLimitMinutes: 60 },
  { category: { slug: "container-security", name: "Container Security" }, slug: "harbor", name: "Harbor Node", os: "Alpine Containers", description: "Inspect container images, secrets, capabilities, and exposed admin APIs.", difficulty: "HARD" as const, timeLimitMinutes: 130 },
];

const challengeCatalog = [
  {
    category: { slug: "web-exploitation", name: "Web Exploitation" },
    slug: "header-mirage",
    title: "Header Mirage",
    description: "Inspect trusted proxy headers and recover the flag from an internal-only admin route.",
    difficulty: "EASY" as const,
    baseXp: 180,
    flag: "TH{trusted_headers_are_not_auth}",
    tags: ["web", "headers", "proxy"],
    hints: [
      { title: "Follow the proxy", content: "Look for identity or network headers forwarded by the edge service.", penaltyPct: 5 },
      { title: "Trust boundary", content: "Ask whether the app is trusting a value the client can still set.", penaltyPct: 10 },
    ],
  },
  {
    category: { slug: "web-exploitation", name: "Web Exploitation" },
    slug: "cookie-cabinet",
    title: "Cookie Cabinet",
    description: "Review cookie attributes and session handling to access a misconfigured learner vault.",
    difficulty: "MEDIUM" as const,
    baseXp: 260,
    flag: "TH{cookies_need_context_and_care}",
    tags: ["web", "session", "cookies"],
    hints: [
      { title: "Inspect attributes", content: "Compare Secure, HttpOnly, SameSite, expiration, and path behavior.", penaltyPct: 5 },
      { title: "Session rotation", content: "Watch what changes after login and role transitions.", penaltyPct: 10 },
    ],
  },
  {
    category: { slug: "cryptography", name: "Cryptography" },
    slug: "nonce-repeat",
    title: "Nonce Repeat",
    description: "Two encrypted notes share a flawed nonce. Recover the hidden training code.",
    difficulty: "HARD" as const,
    baseXp: 420,
    flag: "TH{never_reuse_stream_nonces}",
    tags: ["crypto", "xor", "nonce"],
    hints: [
      { title: "Same keystream", content: "When stream ciphers reuse a keystream, ciphertexts can be compared directly.", penaltyPct: 8 },
      { title: "Known text", content: "Look for predictable JSON and greeting fragments.", penaltyPct: 12 },
    ],
  },
  {
    category: { slug: "forensics", name: "Forensics" },
    slug: "midnight-pcap",
    title: "Midnight PCAP",
    description: "Triage a packet capture and reconstruct the suspicious file transfer before the window closes.",
    difficulty: "MEDIUM" as const,
    baseXp: 300,
    flag: "TH{dns_left_the_breadcrumbs}",
    tags: ["forensics", "pcap", "dns"],
    hints: [
      { title: "Start with conversations", content: "Group traffic by endpoint pair before following individual packets.", penaltyPct: 5 },
      { title: "Look at names", content: "Repeated DNS labels can carry more than hostname intent.", penaltyPct: 10 },
    ],
  },
  {
    category: { slug: "general-skills", name: "General Skills" },
    slug: "sudo-shadow",
    title: "Sudo Shadow",
    description: "A maintenance account has a narrow sudo rule. Turn it into a controlled privilege proof.",
    difficulty: "MEDIUM" as const,
    baseXp: 320,
    flag: "TH{least_privilege_needs_testing}",
    tags: ["linux", "sudo", "privilege"],
    hints: [
      { title: "List allowed commands", content: "Start by checking exactly what the account can run.", penaltyPct: 5 },
      { title: "Environment matters", content: "Arguments and environment variables can change a safe-looking command.", penaltyPct: 12 },
    ],
  },
  {
    category: { slug: "recoinaisance", name: "Recoinaisance" },
    slug: "bucket-signal",
    title: "Bucket Signal",
    description: "Investigate exposed storage metadata and identify the leaked deployment secret.",
    difficulty: "EASY" as const,
    baseXp: 210,
    flag: "TH{public_storage_is_a_finding}",
    tags: ["cloud", "storage", "iam"],
    hints: [
      { title: "List carefully", content: "Object names and timestamps can explain more than object contents.", penaltyPct: 5 },
      { title: "Metadata counts", content: "Inspect custom metadata and old deployment manifests.", penaltyPct: 8 },
    ],
  },
  {
    category: { slug: "reverse-engineering", name: "Reverse Engineering" },
    slug: "signal-trace",
    title: "Signal Trace",
    description: "Reverse a small validation binary and recover the accepted input without brute force.",
    difficulty: "MEDIUM" as const,
    baseXp: 340,
    flag: "TH{read_the_branch_before_the_flag}",
    tags: ["reverse", "binary", "debugging"],
    hints: [
      { title: "Strings first", content: "Static clues can tell you where the validation path begins.", penaltyPct: 5 },
      { title: "Trace branches", content: "Watch comparisons near the failure message.", penaltyPct: 12 },
    ],
  },
  {
    category: { slug: "binary-exploitation", name: "Binary Exploitation" },
    slug: "stack-postcard",
    title: "Stack Postcard",
    description: "Use a controlled crash to understand the stack layout and redirect execution safely.",
    difficulty: "HARD" as const,
    baseXp: 460,
    flag: "TH{control_flow_needs_boundaries}",
    tags: ["pwn", "stack", "memory"],
    hints: [
      { title: "Measure offset", content: "Use a cyclic pattern to find where control begins.", penaltyPct: 8 },
      { title: "Check mitigations", content: "Your strategy depends on what protections are enabled.", penaltyPct: 12 },
    ],
  },
  {
    category: { slug: "blockchain", name: "Blockchain" },
    slug: "vault-reentry",
    title: "Vault Reentry",
    description: "Review a toy smart contract and identify the unsafe withdrawal sequence.",
    difficulty: "MEDIUM" as const,
    baseXp: 360,
    flag: "TH{effects_before_interactions}",
    tags: ["blockchain", "contract", "reentrancy"],
    hints: [
      { title: "Order matters", content: "Compare balance updates with external calls.", penaltyPct: 7 },
      { title: "Repeat path", content: "Ask what can happen before state changes are committed.", penaltyPct: 12 },
    ],
  },
  {
    category: { slug: "networking", name: "Networking" },
    slug: "route-drift",
    title: "Route Drift",
    description: "Inspect routing output and packet captures to find the host leaking traffic.",
    difficulty: "EASY" as const,
    baseXp: 190,
    flag: "TH{routes_tell_stories}",
    tags: ["networking", "routing", "pcap"],
    hints: [
      { title: "Compare paths", content: "Look for one host whose route differs from the baseline.", penaltyPct: 5 },
      { title: "TTL clue", content: "Hop counts can expose the wrong gateway.", penaltyPct: 8 },
    ],
  },
  {
    category: { slug: "ai", name: "AI" },
    slug: "prompt-guard",
    title: "Prompt Guard",
    description: "Test a training assistant policy and identify the unsafe instruction boundary.",
    difficulty: "MEDIUM" as const,
    baseXp: 330,
    flag: "TH{ai_boundaries_need_tests}",
    tags: ["ai", "prompt-injection", "policy"],
    hints: [
      { title: "Role confusion", content: "Separate user instructions from system constraints.", penaltyPct: 6 },
      { title: "Data boundary", content: "Look for where retrieved content is treated as instruction.", penaltyPct: 10 },
    ],
  },
];

async function main() {
  const permissionRows = await Promise.all(
    Object.values(permissions).map((key) =>
      prisma.permission.upsert({
        where: { key },
        update: {},
        create: { key, description: key.replace(":", " ") },
      }),
    ),
  );

  for (const roleName of Object.values(RoleName)) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName },
    });
    for (const key of rolePermissions[roleName]) {
      const permission = permissionRows.find((row) => row.key === key)!;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
    }
  }

  const studentRole = await prisma.role.findUniqueOrThrow({ where: { name: "STUDENT" } });
  const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: "ADMINISTRATOR" } });
  const demoPasswordHash = await argon2.hash("TrainHack123!");
  const superAdminPasswordHash = await argon2.hash("Ares098624!");
  const demoUsers = [
    { email: "ari@trainhack.local", username: "ari", displayName: "Ari Rivera", xp: 12480, level: 7, dailyStreak: 7 },
    { email: "nixwave@trainhack.local", username: "nixwave", displayName: "Nix Wave", xp: 18920, level: 9, dailyStreak: 12 },
    { email: "ciphernova@trainhack.local", username: "ciphernova", displayName: "Cipher Nova", xp: 17440, level: 8, dailyStreak: 9 },
    { email: "rootkind@trainhack.local", username: "rootkind", displayName: "Root Kind", xp: 16850, level: 8, dailyStreak: 5 },
    { email: "mara@trainhack.local", username: "mara", displayName: "Mara Knox", xp: 15120, level: 8, dailyStreak: 10 },
    { email: "sol@trainhack.local", username: "soltrace", displayName: "Sol Trace", xp: 13980, level: 7, dailyStreak: 4 },
    { email: "jun@trainhack.local", username: "jun", displayName: "Jun Park", xp: 9840, level: 6, dailyStreak: 6 },
    { email: "vesper@trainhack.local", username: "vesper", displayName: "Vesper Vale", xp: 8120, level: 5, dailyStreak: 3 },
    { email: "io@trainhack.local", username: "io", displayName: "Io Reyes", xp: 6420, level: 4, dailyStreak: 2 },
    { email: "lena@trainhack.local", username: "lena", displayName: "Lena Ortiz", xp: 4210, level: 3, dailyStreak: 1 },
  ];

  for (const user of demoUsers) {
    const row = await prisma.user.upsert({
      where: { email: user.email },
      update: { displayName: user.displayName, xp: user.xp, level: user.level, dailyStreak: user.dailyStreak },
      create: { ...user, passwordHash: demoPasswordHash },
    });
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: row.id, roleId: studentRole.id } },
      update: {},
      create: { userId: row.id, roleId: studentRole.id },
    });

    await prisma.userSettings.upsert({
      where: { userId: row.id },
      update: {},
      create: { userId: row.id, theme: "system", emailNotifications: true, profileVisibility: "public" },
    });
  }

  const superAdmin = await prisma.user.upsert({
    where: { email: "lakesapphire121@gmail.com" },
    update: {
      username: "lakesapphire121",
      displayName: "Super Admin",
      passwordHash: superAdminPasswordHash,
      xp: 30000,
      level: 12,
    },
    create: {
      email: "lakesapphire121@gmail.com",
      username: "lakesapphire121",
      displayName: "Super Admin",
      passwordHash: superAdminPasswordHash,
      xp: 30000,
      level: 12,
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: superAdmin.id, roleId: adminRole.id } },
    update: {},
    create: { userId: superAdmin.id, roleId: adminRole.id },
  });
  await prisma.userSettings.upsert({
    where: { userId: superAdmin.id },
    update: {},
    create: { userId: superAdmin.id, theme: "system", emailNotifications: true, profileVisibility: "private" },
  });

  for (const path of learningPaths) {
    const courseCategory = await prisma.courseCategory.upsert({
      where: { slug: path.category.slug },
      update: { name: path.category.name, description: path.category.description },
      create: path.category,
    });

    const course = await prisma.course.upsert({
      where: { slug: path.slug },
      update: {
        categoryId: courseCategory.id,
        title: path.title,
        summary: path.summary,
        description: path.description,
        difficulty: path.difficulty,
        status: "PUBLISHED",
      },
      create: {
        categoryId: courseCategory.id,
        slug: path.slug,
        title: path.title,
        summary: path.summary,
        description: path.description,
        difficulty: path.difficulty,
        status: "PUBLISHED",
      },
    });

    for (const [moduleIndex, module] of path.modules.entries()) {
      const moduleRow = await prisma.courseModule.upsert({
        where: { courseId_order: { courseId: course.id, order: moduleIndex + 1 } },
        update: { title: module.title, summary: module.summary, status: "PUBLISHED" },
        create: { courseId: course.id, order: moduleIndex + 1, title: module.title, summary: module.summary, status: "PUBLISHED" },
      });

      for (const [lessonIndex, lesson] of module.lessons.entries()) {
        await prisma.lesson.upsert({
          where: { moduleId_order: { moduleId: moduleRow.id, order: lessonIndex + 1 } },
          update: { ...lesson, status: "PUBLISHED" },
          create: { moduleId: moduleRow.id, order: lessonIndex + 1, ...lesson, status: "PUBLISHED" },
        });
      }
    }
  }

  for (const lab of labCatalog) {
    const labCategory = await prisma.labCategory.upsert({
      where: { slug: lab.category.slug },
      update: { name: lab.category.name },
      create: lab.category,
    });

    await prisma.lab.upsert({
      where: { slug: lab.slug },
      update: {
        categoryId: labCategory.id,
        name: lab.name,
        os: lab.os,
        description: lab.description,
        difficulty: lab.difficulty,
        timeLimitMinutes: lab.timeLimitMinutes,
        status: "PUBLISHED",
      },
      create: {
        categoryId: labCategory.id,
        slug: lab.slug,
        name: lab.name,
        os: lab.os,
        description: lab.description,
        difficulty: lab.difficulty,
        timeLimitMinutes: lab.timeLimitMinutes,
        status: "PUBLISHED",
      },
    });
  }

  for (const challengeSeed of challengeCatalog) {
    const category = await prisma.challengeCategory.upsert({
      where: { slug: challengeSeed.category.slug },
      update: { name: challengeSeed.category.name },
      create: challengeSeed.category,
    });

    const challenge = await prisma.challenge.upsert({
      where: { slug: challengeSeed.slug },
      update: {
        categoryId: category.id,
        title: challengeSeed.title,
        description: challengeSeed.description,
        difficulty: challengeSeed.difficulty,
        baseXp: challengeSeed.baseXp,
        flagHash: sha256(challengeSeed.flag),
        status: "PUBLISHED",
        tags: challengeSeed.tags,
      },
      create: {
        categoryId: category.id,
        slug: challengeSeed.slug,
        title: challengeSeed.title,
        description: challengeSeed.description,
        difficulty: challengeSeed.difficulty,
        baseXp: challengeSeed.baseXp,
        flagHash: sha256(challengeSeed.flag),
        status: "PUBLISHED",
        tags: challengeSeed.tags,
      },
    });

    for (const hint of challengeSeed.hints) {
      const existingHint = await prisma.challengeHint.findFirst({
        where: { challengeId: challenge.id, title: hint.title },
      });
      if (existingHint) {
        await prisma.challengeHint.update({ where: { id: existingHint.id }, data: hint });
      } else {
        await prisma.challengeHint.create({ data: { challengeId: challenge.id, ...hint } });
      }
    }
  }

  const ari = await prisma.user.findUniqueOrThrow({ where: { email: "ari@trainhack.local" } });
  const seededChallenges = await prisma.challenge.findMany({ where: { slug: { in: challengeCatalog.map((challenge) => challenge.slug) } } });
  const seededLabs = await prisma.lab.findMany({ where: { slug: { in: labCatalog.map((lab) => lab.slug) } } });
  const seededLessons = await prisma.lesson.findMany({ take: 8, orderBy: { createdAt: "asc" } });

  await prisma.userProgress.upsert({
    where: { userId: ari.id },
    update: { totalXp: ari.xp, coursesCompleted: 1, labsCompleted: 2, challengesSolved: 3, quizzesPassed: 1, dailyStreak: ari.dailyStreak },
    create: { userId: ari.id, totalXp: ari.xp, coursesCompleted: 1, labsCompleted: 2, challengesSolved: 3, quizzesPassed: 1, dailyStreak: ari.dailyStreak },
  });

  for (const [index, lesson] of seededLessons.entries()) {
    await prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId: ari.id, lessonId: lesson.id } },
      update: { progressPct: index < 5 ? 100 : 65, completedAt: index < 5 ? new Date(Date.now() - (index + 1) * 86400000) : null },
      create: { userId: ari.id, lessonId: lesson.id, progressPct: index < 5 ? 100 : 65, completedAt: index < 5 ? new Date(Date.now() - (index + 1) * 86400000) : null },
    });
  }

  for (const [index, lab] of seededLabs.slice(0, 4).entries()) {
    await prisma.labProgress.upsert({
      where: { userId_labId: { userId: ari.id, labId: lab.id } },
      update: { progressPct: index < 2 ? 100 : 45 + index * 10, completedAt: index < 2 ? new Date(Date.now() - (index + 2) * 86400000) : null, bestTimeSeconds: index < 2 ? 2900 + index * 620 : null },
      create: { userId: ari.id, labId: lab.id, progressPct: index < 2 ? 100 : 45 + index * 10, completedAt: index < 2 ? new Date(Date.now() - (index + 2) * 86400000) : null, bestTimeSeconds: index < 2 ? 2900 + index * 620 : null },
    });
  }

  for (const [index, challenge] of seededChallenges.slice(0, 3).entries()) {
    await prisma.challengeAttempt.upsert({
      where: { challengeId_userId: { challengeId: challenge.id, userId: ari.id } },
      update: { completedAt: new Date(Date.now() - (index + 1) * 43200000), hintCount: index },
      create: { challengeId: challenge.id, userId: ari.id, completedAt: new Date(Date.now() - (index + 1) * 43200000), hintCount: index },
    });

    const solved = await prisma.flagSubmission.findFirst({
      where: { challengeId: challenge.id, userId: ari.id, status: "CORRECT" },
    });
    if (!solved) {
      await prisma.flagSubmission.create({
        data: {
          challengeId: challenge.id,
          userId: ari.id,
          submittedFlagHash: challenge.flagHash,
          status: "CORRECT",
          awardedXp: challenge.baseXp,
        },
      });
    }
  }

  for (const certificate of ["Web Security Foundations", "Cloud Defense Operator"]) {
    await prisma.certificate.upsert({
      where: { serial: `${ari.id}:${certificate}` },
      update: {},
      create: { userId: ari.id, title: certificate, serial: `${ari.id}:${certificate}` },
    });
  }

  const notifications = [
    { title: "Welcome to TrainHack", body: "Your seeded training workspace is ready." },
    { title: "New machine unlocked", body: "Skyline Storage is available in the cloud defense track." },
    { title: "Certificate ready", body: "Your Web Security Foundations certificate can be viewed from Certificates." },
  ];
  for (const item of notifications) {
    const notification =
      (await prisma.notification.findFirst({ where: { title: item.title } })) ??
      (await prisma.notification.create({ data: { type: "IN_APP", ...item } }));
    await prisma.userNotification.upsert({
      where: { userId_notificationId: { userId: ari.id, notificationId: notification.id } },
      update: {},
      create: { userId: ari.id, notificationId: notification.id },
    });
  }

  const communityPosts = [
    { email: "ari@trainhack.local", message: "Finished Header Mirage. The fix write-up is mostly about trust boundaries, not clever payloads." },
    { email: "nixwave@trainhack.local", message: "Packet Forge has a nice DNS trail. Start with conversations before carving files." },
    { email: "mara@trainhack.local", message: "Skyline Storage is a solid reminder that object metadata counts as evidence." },
    { email: "jun@trainhack.local", message: "Binary starter path clicked for me after drawing the stack frame by hand." },
    { email: "ciphernova@trainhack.local", message: "Nonce Repeat is brutal but fair. Known plaintext is the door." },
  ];
  for (const post of communityPosts) {
    const user = await prisma.user.findUniqueOrThrow({ where: { email: post.email } });
    const existing = await prisma.activityLog.findFirst({
      where: { userId: user.id, action: "community.post", metadata: { path: ["message"], equals: post.message } },
    });
    if (!existing) {
      await prisma.activityLog.create({ data: { userId: user.id, action: "community.post", metadata: { message: post.message } } });
    }
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
