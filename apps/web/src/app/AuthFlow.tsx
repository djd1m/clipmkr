'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { safeNextPath } from '../lib/payment-return';
type Notice = { kind: 'created' | 'existing'; target: string; arrived: boolean };
type Recovery = { email: string; next: string | null; returning: boolean };
type Flow = {
  notice: Notice | null;
  dismissNotice: () => void;
  recovery: Recovery | null;
  rememberRecovery: (email: string, next: string | null, returning?: boolean) => void;
  clearRecovery: () => void;
  showNotice: (kind: 'created' | 'existing', target: string) => void;
};
// Direct recovery pages and isolated renders also work with an empty draft.
const AuthFlow = createContext<Flow>({ notice: null, dismissNotice: () => {}, recovery: null, rememberRecovery: () => {}, clearRecovery: () => {}, showNotice: () => {} });
export function useAuthFlow() { return useContext(AuthFlow); }
export function AuthFlowProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [recovery, setRecovery] = useState<Recovery | null>(null);
  useEffect(() => {
    setNotice(current => !current ? null : pathname === current.target
      ? current.arrived ? current : { ...current, arrived: true }
      : current.arrived ? null : current);
    if (pathname !== '/' && pathname !== '/forgot') setRecovery(null);
  }, [pathname]);
  return <AuthFlow.Provider value={{ recovery, notice, dismissNotice: () => setNotice(null),
    rememberRecovery: (email, next, returning = false) => setRecovery({ email, next: safeNextPath(next), returning }),
    clearRecovery: () => setRecovery(null),
    showNotice: (kind, target) => { setRecovery(null); setNotice({ kind, target: target.split('?')[0]!, arrived: pathname === target.split('?')[0] }); },
  }}>
    {children}
  </AuthFlow.Provider>;
}

export function AuthFlowNotice() {
  const { notice, dismissNotice } = useAuthFlow();
  if (!notice) return null;
  return <div className="auth-flow-notice" role="status" aria-live="polite" aria-atomic="true">
    <span>{notice.kind === 'existing' ? 'Аккаунт уже существует. Вы вошли.' : 'Аккаунт создан. Вы вошли.'}</span>
    <button type="button" aria-label="Закрыть уведомление" onClick={dismissNotice}>×</button>
  </div>;
}
