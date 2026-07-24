/**
 * Role-access hooks resolve the current user's role from the auth slice and
 * gate the admin surfaces correctly.
 */
import { describe, it, expect } from "vitest";
import type { ReactNode } from "react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { renderHook } from "@testing-library/react";
import authReducer, { type UserRole } from "@/features/auth/authSlice";
import { useRole, useHasRole, useIsSuperAdmin, useIsManager } from "@/features/admin/adminAccess";

function wrapperFor(role: UserRole | null) {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: { token: "t", refresh: "r", user: role ? { role } : null },
    },
  });
  return ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>;
}

describe("useRole", () => {
  it("returns the role when set", () => {
    const { result } = renderHook(() => useRole(), { wrapper: wrapperFor("manager") });
    expect(result.current).toBe("manager");
  });

  it("returns null when no user", () => {
    const { result } = renderHook(() => useRole(), { wrapper: wrapperFor(null) });
    expect(result.current).toBeNull();
  });
});

describe("useIsSuperAdmin", () => {
  it("is true only for super_admin", () => {
    expect(
      renderHook(() => useIsSuperAdmin(), { wrapper: wrapperFor("super_admin") }).result.current,
    ).toBe(true);
    expect(
      renderHook(() => useIsSuperAdmin(), { wrapper: wrapperFor("manager") }).result.current,
    ).toBe(false);
    expect(
      renderHook(() => useIsSuperAdmin(), { wrapper: wrapperFor("bd_executive") }).result.current,
    ).toBe(false);
    expect(renderHook(() => useIsSuperAdmin(), { wrapper: wrapperFor(null) }).result.current).toBe(
      false,
    );
  });
});

describe("useIsManager", () => {
  it("is true for super_admin and manager, false otherwise", () => {
    expect(
      renderHook(() => useIsManager(), { wrapper: wrapperFor("super_admin") }).result.current,
    ).toBe(true);
    expect(
      renderHook(() => useIsManager(), { wrapper: wrapperFor("manager") }).result.current,
    ).toBe(true);
    expect(
      renderHook(() => useIsManager(), { wrapper: wrapperFor("bd_executive") }).result.current,
    ).toBe(false);
    expect(renderHook(() => useIsManager(), { wrapper: wrapperFor(null) }).result.current).toBe(
      false,
    );
  });
});

describe("useHasRole", () => {
  it("checks membership in the allowed set", () => {
    const wrapper = wrapperFor("bd_executive");
    expect(renderHook(() => useHasRole(["bd_executive"]), { wrapper }).result.current).toBe(true);
    expect(
      renderHook(() => useHasRole(["super_admin", "manager"]), { wrapper }).result.current,
    ).toBe(false);
  });
});
