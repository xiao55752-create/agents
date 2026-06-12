import { type FormEvent, useState } from 'react';

const AUTH_USERS_KEY = 'agentos_demo_users';
const AUTH_SESSION_KEY = 'agentos_demo_session';
const DEMO_USER = {
  name: '演示团队',
  email: 'demo@agentos.local',
  password: 'agentos123',
};

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

interface StoredUser extends AuthUser {
  password: string;
}

interface AuthPageProps {
  onAuthSuccess: (user: AuthUser) => void;
}

function readUsers(): StoredUser[] {
  try {
    const raw = localStorage.getItem(AUTH_USERS_KEY);
    return raw ? (JSON.parse(raw) as StoredUser[]) : [];
  } catch {
    return [];
  }
}

function saveUsers(users: StoredUser[]) {
  localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
}

export function readAuthSession(): AuthUser | null {
  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function clearAuthSession() {
  localStorage.removeItem(AUTH_SESSION_KEY);
}

function saveAuthSession(user: AuthUser) {
  localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(user));
}

export function AuthPage({ onAuthSuccess }: AuthPageProps) {
  const [account, setAccount] = useState('demo@agentos.local');
  const [password, setPassword] = useState('agentos123');
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const normalizedAccount = account.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (!normalizedAccount || !trimmedPassword) {
      setMessage({ type: 'err', text: '请填写完整信息。' });
      return;
    }

    if (trimmedPassword.length < 6) {
      setMessage({ type: 'err', text: '密码至少需要 6 位。' });
      return;
    }

    const users = readUsers();
    let user = users.find((item) => item.email === normalizedAccount);
    if (!user && normalizedAccount === DEMO_USER.email && trimmedPassword === DEMO_USER.password) {
      user = {
        id: `usr_${Date.now()}`,
        name: DEMO_USER.name,
        email: DEMO_USER.email,
        password: DEMO_USER.password,
        createdAt: new Date().toISOString(),
      };
      saveUsers([...users, user]);
    }

    if (!user || user.password !== trimmedPassword) {
      setMessage({ type: 'err', text: '账号或密码不正确。' });
      return;
    }

    const sessionUser: AuthUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    };
    saveAuthSession(sessionUser);
    onAuthSuccess(sessionUser);
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-card-head">
          <div>
            <span className="section-kicker">账号登录</span>
            <h3>登录 agentOS</h3>
            <p>输入账号和密码后进入工作台。</p>
          </div>
        </div>

        <form className="auth-form" onSubmit={submit}>
          <label>
            账号
            <input
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              placeholder="demo@agentos.local"
              autoComplete="username"
              required
            />
          </label>
          <label>
            密码
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="至少 6 位"
              autoComplete="current-password"
              required
            />
          </label>

          {message && <p className={message.type === 'ok' ? 'auth-message ok' : 'auth-message err'}>{message.text}</p>}
          <p className="auth-helper">
            演示账号：<code>{DEMO_USER.email}</code>，密码：<code>{DEMO_USER.password}</code>
          </p>

          <button type="submit" className="btn btn-primary btn-lg auth-submit">
            登录
          </button>
        </form>
      </section>
    </main>
  );
}
