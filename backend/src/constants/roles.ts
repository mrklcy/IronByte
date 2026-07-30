export const roles = ["GUEST", "STUDENT", "INSTRUCTOR", "MODERATOR", "ADMINISTRATOR"] as const;
export type RoleName = (typeof roles)[number];

export const permissions = {
  usersRead: "users:read",
  usersManage: "users:manage",
  contentRead: "content:read",
  contentManage: "content:manage",
  labsUse: "labs:use",
  labsManage: "labs:manage",
  ctfSubmit: "ctf:submit",
  ctfManage: "ctf:manage",
  teamsManage: "teams:manage",
  adminAccess: "admin:access",
} as const;

export type Permission = (typeof permissions)[keyof typeof permissions];
