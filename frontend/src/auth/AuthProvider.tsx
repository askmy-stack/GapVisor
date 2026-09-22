import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  type AuthUser,
  type Membership,
  fetchMe,
  getAccessToken,
  getActiveWorkspaceId,
  login as apiLogin,
  logout as apiLogout,
  probeApi,
  setAccessToken,
  setActiveWorkspaceId,
} from "@/api/client";

type AuthState = {
  ready: boolean;
  liveApi: boolean;
  user: AuthUser | null;
  memberships: Membership[];
  workspaceId: string | null;
  signIn: (email: string, password: string) => Promise<"live" | "demo">;
  signOut: () => Promise<void>;
  setWorkspaceId: (id: string) => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [liveApi, setLiveApi] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [workspaceId, setWorkspaceIdState] = useState<string | null>(
    getActiveWorkspaceId(),
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const up = await probeApi();
      if (cancelled) return;
      setLiveApi(up);
      if (up && getAccessToken()) {
        try {
          const me = await fetchMe();
          if (cancelled) return;
          setUser(me.user);
          setMemberships(me.memberships);
          if (!getActiveWorkspaceId() && me.memberships[0]) {
            setActiveWorkspaceId(me.memberships[0].workspace_id);
            setWorkspaceIdState(me.memberships[0].workspace_id);
          }
        } catch {
          setAccessToken(null);
        }
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const up = await probeApi();
    setLiveApi(up);
    if (!up) {
      // Demo mode: preserve current static UX when API is offline.
      return "demo";
    }
    const res = await apiLogin(email, password);
    setAccessToken(res.access_token);
    setUser(res.user);
    setMemberships(res.memberships);
    const wid = res.memberships[0]?.workspace_id ?? null;
    if (wid) {
      setActiveWorkspaceId(wid);
      setWorkspaceIdState(wid);
    }
    return "live";
  }, []);

  const signOut = useCallback(async () => {
    await apiLogout();
    setUser(null);
    setMemberships([]);
    setWorkspaceIdState(null);
  }, []);

  const setWorkspaceId = useCallback((id: string) => {
    setActiveWorkspaceId(id);
    setWorkspaceIdState(id);
  }, []);

  const value = useMemo(
    () => ({
      ready,
      liveApi,
      user,
      memberships,
      workspaceId,
      signIn,
      signOut,
      setWorkspaceId,
    }),
    [
      ready,
      liveApi,
      user,
      memberships,
      workspaceId,
      signIn,
      signOut,
      setWorkspaceId,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
