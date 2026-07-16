import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

interface Toast { id: number; message: string; kind: 'success' | 'error' }
const ToastContext = createContext<{ toast: (m: string, kind?: Toast['kind']) => void }>({ toast: () => {} });
let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, kind: Toast['kind'] = 'success') => {
    const id = nextId++;
    setToasts((t) => [...t, { id, message, kind }]);
    // Errors persist until dismissed; successes clear after 3s (spec §15).
    if (kind === 'success') setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 no-print">
        {toasts.map((t) => (
          <button
            key={t.id}
            onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}
            className="card shadow-overlay flex items-center gap-2 px-3 py-2 text-[13px] text-left"
          >
            {t.kind === 'success'
              ? <CheckCircle2 size={16} style={{ color: 'var(--c-green)' }} />
              : <XCircle size={16} style={{ color: 'var(--c-red)' }} />}
            {t.message}
          </button>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
