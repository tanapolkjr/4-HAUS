import { useState } from 'react';
import { Plus, UserRound } from 'lucide-react';
import { useQuery } from '@/hooks/useQuery';
import { useToast } from '@/hooks/useToast';
import { addUserProfile, listUsers, updateUser } from '@/api/users';
import { addChannel, listChannels, removeChannel } from '@/api/channels';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Sheet } from '@/components/ui/Sheet';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { errMsg, fmtDate } from '@/lib/format';
import { X } from 'lucide-react';
import type { UserRow } from '@/lib/types';

/** Settings = user management only; everything else is fixed by spec (§14). */
export function SettingsPage() {
  const { toast } = useToast();
  const { data: users, loading, refetch } = useQuery(() => listUsers(true), []);
  const [sheet, setSheet] = useState<UserRow | 'new' | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmToggle, setConfirmToggle] = useState<UserRow | null>(null);

  const openSheet = (u: UserRow | 'new') => {
    setSheet(u);
    setName(u === 'new' ? '' : u.name);
    setEmail(u === 'new' ? '' : u.email);
  };

  const save = async () => {
    if (!name.trim() || !email.trim()) return;
    setBusy(true);
    try {
      if (sheet === 'new') {
        await addUserProfile(name.trim(), email.trim());
        toast(`User “${name.trim()}” added. Create their login in the Supabase dashboard with the same email.`);
      } else if (sheet) {
        await updateUser(sheet.id, { name: name.trim(), email: email.trim() });
        toast('User updated.');
      }
      setSheet(null);
      void refetch();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Save failed.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (u: UserRow) => {
    setConfirmToggle(null);
    try {
      await updateUser(u.id, { is_active: !u.is_active });
      toast(u.is_active ? `${u.name} deactivated.` : `${u.name} reactivated.`);
      void refetch();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Update failed.', 'error');
    }
  };

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-[20px] font-semibold tracking-tight">Settings</h1>
        <Button variant="primary" onClick={() => openSheet('new')}><Plus size={14} /> Add user</Button>
      </div>

      <section className="card">
        <header className="px-4 h-11 flex items-center border-b border-line">
          <h2 className="text-[15px] font-semibold">Users</h2>
        </header>
        {loading ? <SkeletonRows rows={4} /> : (users?.length ?? 0) === 0 ? (
          <EmptyState icon={UserRound} title="No users yet" />
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="table-th">Name</th>
                <th className="table-th">Email</th>
                <th className="table-th">Added</th>
                <th className="table-th">Status</th>
                <th className="table-th w-40" />
              </tr>
            </thead>
            <tbody>
              {(users ?? []).map((u) => (
                <tr key={u.id} className={`hover:bg-subtle ${u.is_active ? '' : 'opacity-60'}`}>
                  <td className="table-td font-medium">{u.name}</td>
                  <td className="table-td text-ink-2">{u.email}</td>
                  <td className="table-td text-ink-2">{fmtDate(u.created_at)}</td>
                  <td className="table-td">
                    <span className="badge-outline" style={u.is_active
                      ? { color: 'var(--c-green)', borderColor: 'var(--c-green)' }
                      : { color: 'var(--text-3)', borderColor: 'var(--border)' }}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="table-td text-right">
                    <button className="text-[12px] text-accent hover:underline mr-3" onClick={() => openSheet(u)}>Edit</button>
                    <button className="text-[12px] text-ink-2 hover:underline" onClick={() => setConfirmToggle(u)}>
                      {u.is_active ? 'Deactivate' : 'Reactivate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <ChannelsPanel />

      <p className="text-[12px] text-ink-3">
        Categories, currencies, and scoring criteria are fixed by the current specification
        and aren’t editable here. Sign-in accounts are created by an admin in the Supabase dashboard.
      </p>

      <Sheet
        open={sheet !== null}
        onClose={() => setSheet(null)}
        title={sheet === 'new' ? 'Add user' : 'Edit user'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setSheet(null)}>Cancel</Button>
            <Button variant="primary" disabled={busy || !name.trim() || !email.trim()} onClick={() => void save()}>
              {busy ? 'Saving…' : sheet === 'new' ? 'Add user' : 'Save changes'}
            </Button>
          </>
        }
      >
        <Input label="Name" required autoFocus value={name} onChange={(e) => setName(e.target.value)} />
        <Input label="Email" required type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        {sheet === 'new' && (
          <p className="text-[12px] text-ink-3">
            After adding, create a Supabase Auth login with this exact email so the person can sign in.
          </p>
        )}
      </Sheet>

      <ConfirmDialog
        open={confirmToggle !== null}
        title={confirmToggle?.is_active ? `Deactivate ${confirmToggle?.name}?` : `Reactivate ${confirmToggle?.name}?`}
        body={confirmToggle?.is_active
          ? `${confirmToggle?.name} won’t appear in future selections. Past records keep their name.`
          : `${confirmToggle?.name} will appear in selections again.`}
        confirmLabel={confirmToggle?.is_active ? 'Deactivate' : 'Reactivate'}
        onConfirm={() => confirmToggle && void toggleActive(confirmToggle)}
        onCancel={() => setConfirmToggle(null)}
      />
    </div>
  );
}

/** Editable target-market channels (patch 0003). */
function ChannelsPanel() {
  const { toast } = useToast();
  const { data: channels, refetch } = useQuery(listChannels, []);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  const add = async () => {
    if (!draft.trim()) return;
    setBusy(true);
    try {
      await addChannel(draft);
      toast(`Channel “${draft.trim()}” added.`);
      setDraft('');
      void refetch();
    } catch (e) {
      toast(errMsg(e, 'Add failed.'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string, name: string) => {
    try {
      await removeChannel(id);
      toast(`Channel “${name}” removed.`);
      void refetch();
    } catch (e) {
      toast(errMsg(e, 'Remove failed.'), 'error');
    }
  };

  return (
    <section className="card">
      <header className="px-4 h-11 flex items-center border-b border-line">
        <h2 className="text-[15px] font-semibold">Target channels</h2>
      </header>
      <div className="p-4 flex flex-col gap-3">
        <div className="flex flex-wrap gap-1.5">
          {(channels ?? []).map((c) => (
            <span key={c.id}
              className="inline-flex items-center gap-1 h-8 pl-3 pr-1.5 rounded-full border border-line text-[13px]">
              {c.name}
              <button aria-label={`Remove ${c.name}`} onClick={() => void remove(c.id, c.name)}
                className="p-1 rounded-full text-ink-3 hover:text-[color:var(--c-red)] hover:bg-subtle">
                <X size={12} />
              </button>
            </span>
          ))}
          {(channels ?? []).length === 0 && (
            <span className="text-[13px] text-ink-3">No channels yet — add the first one below.</span>
          )}
        </div>
        <div className="flex gap-2 max-w-md">
          <input
            className="input"
            placeholder="New channel name… (e.g. TikTok Shop)"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void add()}
          />
          <Button variant="primary" disabled={busy || !draft.trim()} onClick={() => void add()}>Add</Button>
        </div>
        <p className="text-[12px] text-ink-3">
          These appear as the Target-channel choices on every product. Removing one doesn’t change
          products that already use it.
        </p>
      </div>
    </section>
  );
}
