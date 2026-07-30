import { PrismaClient, RoleName } from "@prisma/client";
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
