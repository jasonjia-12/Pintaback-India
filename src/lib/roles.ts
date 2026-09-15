export const ROLES = ["buyer", "partner", "china_ops", "admin"] as const;
export type Role = (typeof ROLES)[number];

export function isRole(v: string): v is Role {
  return (ROLES as readonly string[]).includes(v);
}

export const ROLE_LABEL: Record<Role, string> = {
  buyer: "Buyer",
  partner: "Local Channel Partner",
  china_ops: "China Operations",
  admin: "Administrator",
};
