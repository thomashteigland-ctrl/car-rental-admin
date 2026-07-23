/** Auth is disabled for now — open app access. */

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: string;
};

const OPEN_USER: SessionUser = {
  id: "open",
  email: "open@local",
  name: "Admin",
  role: "owner",
};

export async function login(_email: string, _password: string) {
  return OPEN_USER;
}

export async function logout() {
  // no-op
}

export async function getSession(): Promise<SessionUser | null> {
  return OPEN_USER;
}

export async function requireSession(): Promise<SessionUser> {
  return OPEN_USER;
}
