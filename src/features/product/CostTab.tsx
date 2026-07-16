import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, History, TriangleAlert } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { useUserId } from '@/hooks/useAuth';
import { useQuery } from '@/hooks/useQuery';
import { listCosts, saveCostEstimate } from '@/api/costs';
import { calculateCosts } from '@/lib/calculations';
import { MARGIN_THRESHOLD, SHIPPING_METHODS, SUGGESTED_MARGIN } from '@/lib/constants';
import { fmtTHB, fmtPercent, fmtDate } from '@/lib/format';
import { NumberInput } from '@/components/ui/Input';
import { Segmented } from '@/components/ui/Segmented';
import { Button } from '@/components/ui/Button';
import type { Currency, ProductCost, ProductSummary, ShippingMethod } from '@/lib/types';

type Num = number | '';
const n = (v: Num) => (v === '' ? 0 : v);

interface Draft {
  currency: Currency;
  factoryPrice: Num;
  exchangeRate: Num;
  shippingMethod: ShippingMethod | null;
  shippingCost: Num;
  agencyCost: Num;
  importDutyPercent: Num;
  vatPercent: Num;
  otherCosts: Num;
  ssp: Num;
  asp: Num;
}

const emptyDraft: Draft = {
  currency: 'CNY', factoryPrice: '', exchangeRate: '', shippingMethod: null,
  shippingCost: '', agencyCost: '', importDutyPercent: '', vatPercent: 7, otherCosts: '',
  ssp: '', asp: '',
};

function fromCost(c: ProductCost): Draft {
  return {
    currency: c.currency,
    factoryPrice: c.factory_price,
    exchangeRate: c.currency === 'THB' ? '' : c.exchange_rate,
    shippingMethod: c.shipping_method,
    shippingCost: c.shipping_cost,
    agencyCost: c.agency_cost,
    importDutyPercent: c.import_duty_percent,
    vatPercent: c.vat_percent,
    otherCosts: c.other_costs,
    ssp: c.suggested_selling_price ?? '',
    asp: c.actual_selling_price ?? '',
  };
}

/**
 * Cost tab (spec §10): inputs left, live receipt right. Every keystroke
 * recalculates — no Calculate button (rule 4). Save appends to history.
 */
export function CostTab({ product, onChanged }: { product: ProductSummary; onChanged: () => void }) {
  const { toast } = useToast();
  const userId = useUserId();
  const { data: history, refetch } = useQuery(() => listCosts(product.id), [product.id]);

  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [viewing, setViewing] = useState<ProductCost | null>(null); // read-only historical view
  const [busy, setBusy] = useState(false);

  // Prefill from the most recent estimate so a re-quote is an edit, not a re-type.
  useEffect(() => {
    const latest = history?.[0];
    if (latest) setDraft(fromCost(latest));
  }, [history?.[0]?.id]);

  const active: Draft = viewing ? fromCost(viewing) : draft;

  const results = useMemo(() => calculateCosts({
    factoryPrice: n(active.factoryPrice),
    currency: active.currency,
    exchangeRate: n(active.exchangeRate) || 1,
    shippingCost: n(active.shippingCost),
    agencyCost: n(active.agencyCost),
    importDutyPercent: n(active.importDutyPercent),
    vatPercent: n(active.vatPercent),
    otherCosts: n(active.otherCosts),
    suggestedSellingPrice: active.ssp === '' ? null : active.ssp,
    actualSellingPrice: active.asp === '' ? null : active.asp,
  }), [active]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => {
    if (viewing) return;
    setDraft((d) => ({ ...d, [k]: v }));
  };

  /* Required to save: factory price, currency, shipping method, shipping cost,
     duty %, VAT % — and exchange rate unless THB (spec §10). */
  const missing: string[] = [];
  if (n(draft.factoryPrice) <= 0) missing.push('factory price');
  if (draft.currency !== 'THB' && n(draft.exchangeRate) <= 0) missing.push('exchange rate');
  if (!draft.shippingMethod) missing.push('shipping method');
  if (draft.shippingCost === '') missing.push('shipping cost');
  if (draft.importDutyPercent === '') missing.push('import duty %');
  if (draft.vatPercent === '') missing.push('VAT %');

  const save = async () => {
    if (missing.length) { toast(`Still needed: ${missing.join(', ')}.`, 'error'); return; }
    setBusy(true);
    try {
      await saveCostEstimate(product.id, {
        factoryPrice: n(draft.factoryPrice),
        currency: draft.currency,
        exchangeRate: draft.currency === 'THB' ? 1 : n(draft.exchangeRate),
        shippingMethod: draft.shippingMethod,
        shippingCost: n(draft.shippingCost),
        agencyCost: n(draft.agencyCost),
        importDutyPercent: n(draft.importDutyPercent),
        vatPercent: n(draft.vatPercent),
        otherCosts: n(draft.otherCosts),
        suggestedSellingPrice: draft.ssp === '' ? null : draft.ssp,
        actualSellingPrice: draft.asp === '' ? null : draft.asp,
      }, userId);
      toast('Estimate saved — history preserved.');
      void refetch();
      onChanged();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Save failed.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const marginColor =
    results.grossMargin == null ? undefined
      : results.grossMargin >= MARGIN_THRESHOLD ? 'var(--c-green)'
      : results.grossMargin >= 0 ? 'var(--c-amber)' : 'var(--c-red)';

  return (
    <div className="flex flex-col gap-4 pb-8">
      {viewing && (
        <div className="rounded-card border border-line bg-subtle px-3 py-2 text-[13px] text-ink-2 flex items-center gap-2">
          <History size={14} />
          Viewing the estimate from {fmtDate(viewing.created_at)} (read-only).
          <button className="text-accent hover:underline ml-auto" onClick={() => setViewing(null)}>
            Back to current
          </button>
        </div>
      )}

      {results.lossWarning && (
        <p className="text-[13px] rounded-card border px-3 py-2 flex items-center gap-2"
          style={{ borderColor: 'var(--c-red)', color: 'var(--c-red)', background: 'color-mix(in srgb, var(--c-red) 8%, transparent)' }}>
          <TriangleAlert size={14} />
          Selling below landed cost — this price loses money on every unit. You can still save it.
        </p>
      )}

      <div className="grid lg:grid-cols-[1fr_340px] gap-6 items-start">
        {/* ——— Inputs ——— */}
        <div className="flex flex-col gap-5">
          <section className="card p-5 flex flex-col gap-4">
            <h2 className="text-[15px] font-semibold">Factory price</h2>
            <div className="grid grid-cols-2 gap-3 items-end">
              <NumberInput label="Factory price" required value={active.factoryPrice}
                onValue={(v) => set('factoryPrice', v)} disabled={!!viewing} />
              <Segmented options={['CNY', 'USD', 'THB'] as Currency[]} value={active.currency}
                onChange={(c) => set('currency', c)} label="Currency" disabled={!!viewing} />
            </div>
            {active.currency !== 'THB' && (
              <NumberInput
                label={`Exchange rate (${active.currency} → THB)`} required
                value={active.exchangeRate}
                onValue={(v) => set('exchangeRate', v)}
                hint="Enter today’s rate — it’s stored with the estimate so history stays honest."
                disabled={!!viewing}
              />
            )}
          </section>

          <section className="card p-5 flex flex-col gap-4">
            <h2 className="text-[15px] font-semibold">Import costs (per unit, THB)</h2>
            <Segmented options={SHIPPING_METHODS} value={active.shippingMethod}
              onChange={(m) => set('shippingMethod', m)} label="Shipping method" disabled={!!viewing} />
            <div className="grid grid-cols-2 gap-3">
              <NumberInput label="Shipping cost" required suffix="฿" value={active.shippingCost}
                onValue={(v) => set('shippingCost', v)} disabled={!!viewing} />
              <NumberInput label="Agency cost" suffix="฿" value={active.agencyCost}
                onValue={(v) => set('agencyCost', v)} disabled={!!viewing} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <NumberInput label="Import duty" required suffix="%" value={active.importDutyPercent}
                onValue={(v) => set('importDutyPercent', v)} disabled={!!viewing} />
              <NumberInput label="VAT" required suffix="%" value={active.vatPercent}
                onValue={(v) => set('vatPercent', v)} disabled={!!viewing} />
              <NumberInput label="Other costs" suffix="฿" value={active.otherCosts}
                onValue={(v) => set('otherCosts', v)} disabled={!!viewing} />
            </div>
          </section>

          <section className="card p-5 flex flex-col gap-4">
            <h2 className="text-[15px] font-semibold">Pricing</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <NumberInput
                  label="Suggested selling price" suffix="฿"
                  value={active.ssp}
                  onValue={(v) => set('ssp', v)}
                  placeholder={results.landedCost > 0 ? results.autoSuggestedPrice.toFixed(2) : undefined}
                  disabled={!!viewing}
                />
                {!viewing && active.ssp === '' && results.landedCost > 0 && (
                  <button
                    className="mt-1 text-[12px] text-accent hover:underline"
                    onClick={() => set('ssp', results.autoSuggestedPrice)}
                  >
                    Use {fmtTHB(results.autoSuggestedPrice)} ({SUGGESTED_MARGIN * 100}% margin)
                  </button>
                )}
              </div>
              <NumberInput label="Actual selling price" suffix="฿" value={active.asp}
                onValue={(v) => set('asp', v)}
                hint="Optional — fill in once real market pricing is known."
                disabled={!!viewing} />
            </div>
          </section>

          {!viewing && (
            <div className="flex items-center gap-3">
              <Button variant="primary" size="lg" disabled={busy || missing.length > 0} onClick={() => void save()}>
                {busy ? 'Saving…' : 'Save estimate'}
              </Button>
              {missing.length > 0 && (
                <span className="text-[12px] text-ink-3">Still needed: {missing.join(', ')}.</span>
              )}
            </div>
          )}
        </div>

        {/* ——— Receipt ——— */}
        <aside className="card p-5 lg:sticky lg:top-6 flex flex-col gap-2 tnum">
          <h2 className="text-[12px] font-medium uppercase tracking-[0.04em] text-ink-2">Cost breakdown</h2>
          <ReceiptLine label={`Factory cost (THB)`} value={fmtTHB(results.factoryCostTHB)} />
          <ReceiptLine label="+ Shipping" value={fmtTHB(n(active.shippingCost))} />
          <ReceiptLine label="+ Agency" value={fmtTHB(n(active.agencyCost))} />
          <ReceiptLine label={`+ Import duty (${n(active.importDutyPercent)}% of CIF)`} value={fmtTHB(results.importDuty)} />
          <ReceiptLine label={`+ VAT (${n(active.vatPercent)}%)`} value={fmtTHB(results.vat)} />
          <ReceiptLine label="+ Other" value={fmtTHB(n(active.otherCosts))} />
          <div className="border-t border-line my-1" />
          <div className="flex items-baseline justify-between">
            <span className="text-[13px] font-medium">Landed cost</span>
            <span key={results.landedCost} className="text-[28px] font-semibold value-flash">
              {fmtTHB(results.landedCost)}
            </span>
          </div>
          <div className="border-t border-line my-1" />
          <ReceiptLine label="Gross profit" value={fmtTHB(results.grossProfit)} color={marginColor} />
          <ReceiptLine label="Gross margin" value={fmtPercent(results.grossMargin)} color={marginColor}
            hint={results.grossMargin != null ? `${MARGIN_THRESHOLD}% is the approval threshold` : undefined} />
          {results.netProfit != null ? (
            <>
              <ReceiptLine label="Net profit" value={fmtTHB(results.netProfit)} />
              <ReceiptLine label="ROI" value={fmtPercent(results.roi)} />
            </>
          ) : (
            <p className="text-[12px] text-ink-3 pt-1">
              Enter an actual selling price to see net profit and ROI.
            </p>
          )}
        </aside>
      </div>

      {/* ——— History (append-only) ——— */}
      <section className="card">
        <button
          className="w-full flex items-center gap-2 px-4 h-11 text-left"
          onClick={() => setHistoryOpen((v) => !v)}
          aria-expanded={historyOpen}
        >
          <ChevronRight size={14} className={`transition-transform ${historyOpen ? 'rotate-90' : ''}`} />
          <span className="text-[14px] font-medium">Estimate history</span>
          <span className="text-[12px] text-ink-3">({history?.length ?? 0})</span>
        </button>
        {historyOpen && (
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="table-th">Date</th>
                <th className="table-th text-right">Factory price</th>
                <th className="table-th text-right">Landed cost</th>
                <th className="table-th text-right">Margin</th>
                <th className="table-th w-24" />
              </tr>
            </thead>
            <tbody>
              {(history ?? []).map((c, i) => (
                <tr key={c.id} className="hover:bg-subtle">
                  <td className="table-td">
                    {fmtDate(c.created_at)}
                    {i === 0 && (
                      <span className="ml-2 badge-outline" style={{ color: 'var(--accent)', borderColor: 'var(--accent)' }}>
                        Current
                      </span>
                    )}
                  </td>
                  <td className="table-td text-right tnum">{c.factory_price.toFixed(2)} {c.currency}</td>
                  <td className="table-td text-right tnum">{fmtTHB(c.landed_cost)}</td>
                  <td className="table-td text-right tnum">{fmtPercent(c.gross_margin)}</td>
                  <td className="table-td text-right">
                    {i > 0 && (
                      <button className="text-[12px] text-accent hover:underline" onClick={() => setViewing(c)}>
                        View
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {(history ?? []).length === 0 && (
                <tr><td colSpan={5} className="table-td text-ink-3">No estimates saved yet.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function ReceiptLine({ label, value, color, hint }: { label: string; value: string; color?: string; hint?: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-[13px]">
        <span className="text-ink-2">{label}</span>
        <span key={value} className="font-medium value-flash" style={color ? { color } : undefined}>{value}</span>
      </div>
      {hint && <p className="text-[11px] text-ink-3 text-right">{hint}</p>}
    </div>
  );
}
