import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type UserRole = "super_admin" | "manager" | "bd_executive";

export interface AuthUser {
  id?: string | number;
  name?: string;
  email?: string;
  role?: UserRole;
}
export interface AuthState {
  token: string | null;
  refresh: string | null;
  user: AuthUser | null;
}

const stored: AuthState | null = (() => {
  try {
    if (typeof localStorage === "undefined") return null;
    return JSON.parse(localStorage.getItem("auth") || "null");
  } catch {
    return null;
  }
})();

const initialState: AuthState = stored || { token: null, refresh: null, user: null };

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials(
      state,
      { payload }: PayloadAction<{ access: string; refresh: string; user: AuthUser | null }>,
    ) {
      state.token = payload.access;
      state.refresh = payload.refresh;
      state.user = payload.user;
      try {
        localStorage.setItem("auth", JSON.stringify(state));
      } catch {}
    },
    logout(state) {
      state.token = null;
      state.refresh = null;
      state.user = null;
      try {
        localStorage.removeItem("auth");
      } catch {}
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;
