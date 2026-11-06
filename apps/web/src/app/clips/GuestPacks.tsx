'use client';
import { useEffect, useRef, useState } from 'react';
import type { ClipScreen } from '../../lib/screen-contract';
import { GUEST_CONSENT_TEXT, GUEST_CONSENT_VERSION, addGuestPreselect, type GuestPackSummary } from '../../lib/guest-contract';
import { rpc } from '../../lib/rpc';

/** A request from a clip card: «mark this clip». `nonce` grows on every press, so a repeated press re-scrolls. */
export interface GuestPreselect { clip_id: string; nonce: number }

/** Reduced motion is checked in code: a JS scroll with an explicit behavior is not reliably undone by the CSS rule. */
export function revealGuestForm(section: Pick<HTMLElement, 'scrollIntoView'> | null, field: Pick<HTMLInputElement, 'focus'> | null,
  matchMedia: ((query: string) => { matches: boolean }) | undefined): void {
  const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  section?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  field?.focus({ preventScroll: true });
}

export function GuestPacks({ videoId, clips, initialPacks, consentHash, preselect, onClose }: {
  videoId: string; clips: ClipScreen[]; initialPacks: GuestPackSummary[]; consentHash: string; preselect?: GuestPreselect | null; onClose?: () => void;
}) {
  const [visible, setVisible] = useState(!onClose), [focusNonce, setFocusNonce] = useState(0);
  const focused = useRef(0);
  const [packs, setPacks] = useState(initialPacks), [selected, setSelected] = useState<string[]>([]);
  const [name, setName] = useState(''), [consent, setConsent] = useState<string | null>(null);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const sending = useRef(false);
  const eligible = clips.filter(c => c.available).map(c => c.clip_id);
  const payloadKey = JSON.stringify([videoId, name, [...selected].sort(), [...selected].filter(id => eligible.includes(id)).sort(), consentHash, GUEST_CONSENT_VERSION]);
  const confirmed = consent === payloadKey;
  useEffect(() => { setConsent(null); setSelected(old => old.filter(id => eligible.includes(id))); }, [videoId, consentHash, selected.filter(id => eligible.includes(id)).sort().join('|')]);
  const sectionRef = useRef<HTMLElement>(null), nameRef = useRef<HTMLInputElement>(null), disclosureRef = useRef<HTMLDetailsElement>(null), handled = useRef(0);
  useEffect(() => {
    // Polling replaces `clips` every 5 s; the nonce guard keeps one press = one scroll.
    if (busy || !preselect || preselect.nonce === handled.current) return;
    handled.current = preselect.nonce; setVisible(true); setFocusNonce(preselect.nonce);
    const selectable = clips.filter(c => c.available).map(c => c.clip_id);
    setSelected(old => addGuestPreselect(old, preselect.clip_id, selectable)); setConsent(null);
    if (disclosureRef.current) disclosureRef.current.open = true;
  }, [preselect, clips, busy]);
  useEffect(() => {
    // The section must be visible in the committed DOM before focusing its field.
    if (!visible || busy || !focusNonce || focused.current === focusNonce) return;
    focused.current = focusNonce;
    revealGuestForm(sectionRef.current, nameRef.current, typeof window === 'undefined' ? undefined : window.matchMedia?.bind(window));
  }, [visible, focusNonce, busy]);
  const update = (p: GuestPackSummary) => setPacks(old => [{ ...p, url: new URL(p.url, window.location.origin).href }, ...old.filter(v => v.guest_pack_id !== p.guest_pack_id)]);
  async function action(work: () => Promise<void>) {
    if (sending.current) return; sending.current = true; setBusy(true); setMessage('');
    try { await work(); } catch (error) { setMessage(error instanceof Error ? error.message : 'Не удалось выполнить действие'); }
    finally { sending.current = false; setBusy(false); }
  }
  async function create() {
    if (!confirmed || !name.trim() || !selected.length || selected.some(id => !eligible.includes(id))) return;
    const pack = await rpc<GuestPackSummary>('guest.create', { video_id: videoId, clip_ids: selected, guest_name: name,
      consent_confirmed: confirmed, consent_version: GUEST_CONSENT_VERSION, consent_text_hash: consentHash }, true);
    update(pack); setName(''); setSelected([]); setConsent(null);
    setMessage('Пакет создан. Нажмите «Отправить гостю», чтобы включить ссылку на 14 дней.');
  }
  async function send(pack: GuestPackSummary) {
    const sent = await rpc<GuestPackSummary>('guest.send', { guest_pack_id: pack.guest_pack_id, channel: 'copy' }, true);
    update(sent);
    try { await navigator.clipboard.writeText(new URL(sent.url, window.location.origin).href); setMessage('Ссылка скопирована. Отправьте её гостю.'); }
    catch { setMessage('Ссылка включена. Скопируйте её из поля пакета и отправьте гостю.'); }
  }
  return <section ref={sectionRef} aria-labelledby="guest-title" className="guest-context" hidden={!visible}>
    <details ref={disclosureRef} className="guest-disclosure"><summary id="guest-title">Клипы для гостя</summary>
    {onClose && <button type="button" className="secondary guest-close" disabled={busy} onClick={() => { if(disclosureRef.current) disclosureRef.current.open = false; setVisible(false); onClose(); }}>Закрыть</button>}<p>Отметьте моменты с участием гостя. Разрешение на публикацию нужно получить заранее.</p>
    <form onSubmit={event => { event.preventDefault(); void action(create); }}>
      <fieldset disabled={busy} style={{ border: 0, padding: 0, minWidth: 0 }}>
        <label>Имя гостя <input ref={nameRef} value={name} maxLength={100} required onChange={e => { setName(e.target.value); setConsent(null); }} /></label>
        {clips.filter(c => c.available).map(c => <label key={c.clip_id} className="check">
          <input type="checkbox" checked={selected.includes(c.clip_id)} onChange={e => { setSelected(old => e.target.checked ? [...old, c.clip_id] : old.filter(id => id !== c.clip_id)); setConsent(null); }} /> {c.title}
        </label>)}
        {!clips.some(c => c.available) && <p>Для пакета нужны готовые клипы с действующим сроком хранения.</p>}
        <label className="check"><input type="checkbox" checked={confirmed} required onChange={e => setConsent(e.target.checked ? payloadKey : null)} /> {GUEST_CONSENT_TEXT}</label>
        <button disabled={!confirmed || !selected.length || !name.trim() || selected.some(id => !eligible.includes(id))}>Создать пакет</button>
      </fieldset>
    </form>
    {packs.map(pack => <article key={pack.guest_pack_id} className="guest-pack">
      <h3>{pack.guest_name}</h3>
      <p>{pack.revoked_at ? 'Пакет отозван' : pack.expires_at ? `Ссылка действует до ${new Date(pack.expires_at).toLocaleString('ru-RU')}` : 'Ещё не отправлен. Ссылка закрыта.'}</p>
      {!pack.revoked_at && <>
        {pack.sent_at ? <label>Ссылка для гостя <input aria-label={`Ссылка для ${pack.guest_name}`} readOnly style={{ width: '100%' }}
          value={pack.url} onFocus={e => e.currentTarget.select()} /></label>
          : <button disabled={busy} onClick={() => void action(() => send(pack))}>Отправить гостю</button>}
        <p>Файлы доступны по сроку хранения клипов; отзыв закрывает гостевой доступ к ним.</p>
        <button className="secondary" disabled={busy} onClick={() => void action(async () => {
          const result = await rpc<{ revoked_at: string }>('guest.revoke', { guest_pack_id: pack.guest_pack_id }, true);
          update({ ...pack, ...result }); setMessage('Пакет отозван. Гостевая страница и файлы закрыты.');
        })}>Отозвать пакет</button>
      </>}
    </article>)}
  </details>{message && <p role="status">{message}</p>}</section>;
}
