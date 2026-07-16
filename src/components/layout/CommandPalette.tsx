import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useQuery } from '@/hooks/useQuery';
import { listProductSummaries } from '@/api/products';
import { listFactories } from '@/api/factories';
import { ProductThumb } from '@/components/ui/ProductThumb';
import { DecisionBadge } from '@/components/ui/Badge';

/** ⌘K / Ctrl-K global search across factories and products (spec §6). */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
        setQuery('');
        setCursor(0);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const { data: products } = useQuery(listProductSummaries, [open]);
  const { data: factories } = useQuery(listFactories, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const p = (products ?? [])
      .filter((x) => x.name.toLowerCase().includes(q) || (x.model_number ?? '').toLowerCase().includes(q))
      .slice(0, 6)
      .map((x) => ({ kind: 'product' as const, id: x.id, item: x }));
    const f = (factories ?? [])
      .filter((x) => x.name.toLowerCase().includes(q))
      .slice(0, 4)
      .map((x) => ({ kind: 'factory' as const, id: x.id, item: x }));
    return [...p, ...f];
  }, [query, products, factories]);

  const go = (r: (typeof results)[number]) => {
    setOpen(false);
    navigate(r.kind === 'product' ? `/products/${r.id}` : `/factories?focus=${r.id}`);
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center pt-[15vh] p-4 no-print">
      <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} aria-hidden />
      <div className="relative card rounded-modal shadow-overlay w-full max-w-lg overflow-hidden">
        <div className="flex items-center gap-2 px-4 h-12 border-b border-line">
          <Search size={16} className="text-ink-3" />
          <input
            autoFocus
            className="flex-1 bg-transparent outline-none text-[14px]"
            placeholder="Search products and factories…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setCursor(0); }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') setCursor((c) => Math.min(c + 1, results.length - 1));
              if (e.key === 'ArrowUp') setCursor((c) => Math.max(c - 1, 0));
              if (e.key === 'Enter' && results[cursor]) go(results[cursor]);
            }}
          />
          <kbd className="text-[11px] text-ink-3 border border-line rounded px-1">esc</kbd>
        </div>
        <div className="max-h-72 overflow-y-auto py-1">
          {query && results.length === 0 && (
            <p className="px-4 py-6 text-[13px] text-ink-2 text-center">No matches for “{query}”.</p>
          )}
          {results.map((r, i) => (
            <button
              key={`${r.kind}-${r.id}`}
              onClick={() => go(r)}
              onMouseEnter={() => setCursor(i)}
              className={`w-full flex items-center gap-3 px-4 h-11 text-left ${i === cursor ? 'bg-subtle' : ''}`}
            >
              {r.kind === 'product' ? (
                <>
                  <ProductThumb path={r.item.hero_url} size={28} />
                  <span className="text-[13px] font-medium truncate flex-1">{r.item.name}</span>
                  <DecisionBadge status={r.item.decision_status} size="sm" />
                </>
              ) : (
                <>
                  <span className="w-7 h-7 rounded bg-subtle inline-flex items-center justify-center text-[11px] text-ink-2 shrink-0">F</span>
                  <span className="text-[13px] truncate flex-1">{r.item.name}</span>
                  <span className="text-[11px] text-ink-3">Factory</span>
                </>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
