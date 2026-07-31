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
  const demoPasswordHash = await argon2.hash("TrainHack123!");
  const demoUsers = [
    { email: "ari@trainhack.local", username: "ari", displayName: "Ari Rivera", xp: 12480, level: 7, dailyStreak: 7 },
    { email: "nixwave@trainhack.local", username: "nixwave", displayName: "Nix Wave", xp: 18920, level: 9, dailyStreak: 12 },
    { email: "ciphernova@trainhack.local", username: "ciphernova", displayName: "Cipher Nova", xp: 17440, level: 8, dailyStreak: 9 },
    { email: "rootkind@trainhack.local", username: "rootkind", displayName: "Root Kind", xp: 16850, level: 8, dailyStreak: 5 },
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
  }

  const courseCategory = await prisma.courseCategory.upsert({
    where: { slug: "web-security" },
    update: { name: "Web Security", description: "Foundations for modern web exploitation and defense." },
    create: { slug: "web-security", name: "Web Security", description: "Foundations for modern web exploitation and defense." },
  });

  const course = await prisma.course.upsert({
    where: { slug: "web-security-foundations" },
    update: {
      categoryId: courseCategory.id,
      title: "Web Security Foundations",
      summary: "Build practical confidence with recon, validation, auth, and SSRF.",
      description: "A connected path of lessons, labs, and CTF checkpoints.",
      difficulty: "BEGINNER",
      status: "PUBLISHED",
    },
    create: {
      categoryId: courseCategory.id,
      slug: "web-security-foundations",
      title: "Web Security Foundations",
      summary: "Build practical confidence with recon, validation, auth, and SSRF.",
      description: "A connected path of lessons, labs, and CTF checkpoints.",
      difficulty: "BEGINNER",
      status: "PUBLISHED",
    },
  });

  const moduleRows = [
    { order: 1, title: "Recon Basics", summary: "Map routes, headers, and app behavior." },
    { order: 2, title: "Input Validation", summary: "Spot validation gaps before they become bugs." },
    { order: 3, title: "Auth Bypass", summary: "Reason about trust boundaries and sessions." },
  ];

  for (const module of moduleRows) {
    const moduleRow = await prisma.courseModule.upsert({
      where: { courseId_order: { courseId: course.id, order: module.order } },
      update: { title: module.title, summary: module.summary, status: "PUBLISHED" },
      create: { courseId: course.id, ...module, status: "PUBLISHED" },
    });

    await prisma.lesson.upsert({
      where: { moduleId_order: { moduleId: moduleRow.id, order: 1 } },
      update: {
        title: `${module.title} Lab`,
        content: `Hands-on practice for ${module.title.toLowerCase()}.`,
        estimatedMinutes: 35 + module.order * 10,
        status: "PUBLISHED",
      },
      create: {
        moduleId: moduleRow.id,
        order: 1,
        title: `${module.title} Lab`,
        content: `Hands-on practice for ${module.title.toLowerCase()}.`,
        estimatedMinutes: 35 + module.order * 10,
        status: "PUBLISHED",
      },
    });
  }

  const labCategory = await prisma.labCategory.upsert({
    where: { slug: "web-security" },
    update: { name: "Web Security" },
    create: { slug: "web-security", name: "Web Security" },
  });

  const labRows = [
    { slug: "apollo", name: "Apollo", os: "Ubuntu", description: "Gateway header analysis lab.", difficulty: "MEDIUM" as const, timeLimitMinutes: 90 },
    { slug: "mica", name: "Mica", os: "Windows", description: "Service enumeration and auth review lab.", difficulty: "HARD" as const, timeLimitMinutes: 120 },
  ];

  for (const lab of labRows) {
    await prisma.lab.upsert({
      where: { slug: lab.slug },
      update: { categoryId: labCategory.id, ...lab, status: "PUBLISHED" },
      create: { categoryId: labCategory.id, ...lab, status: "PUBLISHED" },
    });
  }

  const web = await prisma.challengeCategory.upsert({
    where: { name: "Web Security" },
    update: {},
    create: { name: "Web Security", slug: "web-security" },
  });

  await prisma.challenge.upsert({
    where: { slug: "header-mirage" },
    update: {},
    create: {
      categoryId: web.id,
      slug: "header-mirage",
      title: "Header Mirage",
      description: "Inspect trusted proxy headers and recover the flag.",
      difficulty: "EASY",
      baseXp: 180,
      flagHash: sha256("TH{trusted_headers_are_not_auth}"),
      status: "PUBLISHED",
      tags: ["web", "headers", "proxy"],
    },
  });
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
