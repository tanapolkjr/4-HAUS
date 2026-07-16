import { useEffect, useState } from 'react';
import { Sheet } from '@/components/ui/Sheet';
import { Input, Textarea } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import { useUserId } from '@/hooks/useAuth';
import { createFactory, updateFactory, type FactoryInput } from '@/api/factories';
import { PLATFORMS } from '@/lib/constants';
import type { Factory, Platform } from '@/lib/types';

const blank: FactoryInput = {
  name: '', platform: null, contact_person: null, contact_phone: null,
  contact_email: null, wechat_or_whatsapp: null, country: 'China', notes: null,
};

/** Add/Edit factory in a right-side sheet — the list stays visible behind (spec §8). */
export function FactorySheet({
  open, factory, existingNames, onClose, onSaved,
}: {
  open: boolean;
  factory: Factory | null;           // null = create
  existingNames: string[];
  onClose: () => void;
  onSaved: (f: Factory) => void;
}) {
  const { toast } = useToast();
  const userId = useUserId();
  const [form, setForm] = useState<FactoryInput>(blank);
  const [busy, setBusy] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(factory ? { ...factory } : blank);
      setNameError(null);
    }
  }, [open, factory]);

  const set = <K extends keyof FactoryInput>(k: K, v: FactoryInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    const name = form.name.trim();
    if (!name) { setNameError('Factory name is required.'); return; }
    const duplicate = existingNames.some(
      (n) => n.toLowerCase() === name.toLowerCase() && n !== factory?.name,
    );
    if (duplicate) { setNameError('A factory with this name already exists.'); return; }
    setBusy(true);
    try {
      const saved = factory
        ? await updateFactory(factory.id, { ...form, name })
        : await createFactory({ ...form, name }, userId);
      toast(factory ? 'Factory updated.' : `Factory “${name}” added.`);
      onSaved(saved);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Save failed.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={factory ? 'Edit factory' : 'New factory'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => void save()} disabled={busy}>
            {busy ? 'Saving…' : factory ? 'Save changes' : 'Add factory'}
          </Button>
        </>
      }
    >
      <Input label="Name" required autoFocus value={form.name} error={nameError}
        onChange={(e) => { set('name', e.target.value); setNameError(null); }} />
      <Select
        label="Platform"
        value={form.platform ?? ''}
        placeholder="Where was this factory found?"
        options={PLATFORMS.map((p) => ({ value: p, label: p }))}
        onChange={(e) => set('platform', (e.target.value || null) as Platform | null)}
      />
      <Input label="Contact person" value={form.contact_person ?? ''}
        onChange={(e) => set('contact_person', e.target.value || null)} />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Phone" value={form.contact_phone ?? ''}
          onChange={(e) => set('contact_phone', e.target.value || null)} />
        <Input label="WeChat / WhatsApp" value={form.wechat_or_whatsapp ?? ''}
          onChange={(e) => set('wechat_or_whatsapp', e.target.value || null)} />
      </div>
      <Input label="Email" type="email" value={form.contact_email ?? ''}
        onChange={(e) => set('contact_email', e.target.value || null)} />
      <Input label="Country" value={form.country ?? ''}
        onChange={(e) => set('country', e.target.value || null)} />
      <Textarea label="Notes" value={form.notes ?? ''} placeholder="Payment terms, sample policy, impressions…"
        onChange={(e) => set('notes', e.target.value || null)} />
    </Sheet>
  );
}
