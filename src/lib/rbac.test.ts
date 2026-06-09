import { describe, expect, it } from "vitest";
import { Role } from "@prisma/client";
import { roleSatisfies } from "@/lib/rbac";

describe("roleSatisfies", () => {
  it("OWNER satisfies every role", () => {
    expect(roleSatisfies(Role.OWNER, Role.OWNER)).toBe(true);
    expect(roleSatisfies(Role.OWNER, Role.BROKER)).toBe(true);
    expect(roleSatisfies(Role.OWNER, Role.VIEWER)).toBe(true);
  });

  it("BROKER satisfies BROKER and VIEWER but not OWNER", () => {
    expect(roleSatisfies(Role.BROKER, Role.OWNER)).toBe(false);
    expect(roleSatisfies(Role.BROKER, Role.BROKER)).toBe(true);
    expect(roleSatisfies(Role.BROKER, Role.VIEWER)).toBe(true);
  });

  it("VIEWER satisfies only VIEWER", () => {
    expect(roleSatisfies(Role.VIEWER, Role.BROKER)).toBe(false);
    expect(roleSatisfies(Role.VIEWER, Role.VIEWER)).toBe(true);
  });
});
