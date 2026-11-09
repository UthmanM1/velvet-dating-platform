"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Heart, Loader2, Send } from "lucide-react";
import { Alert, Field } from "@/components/ui";
import { CITY_NAMES, GENDER_LABEL, GENDERS, INTENTION_LABEL, INTENTIONS, INTERESTS, REPORT_REASON_LABEL } from "@/lib/reference";
import type { ActionResult } from "@/server/services/auth";
import type { Profile } from "@/lib/types";
import {
  contactAction, forgotAction, loginAction, registerAction, resetAction,
} from "@/app/actions/public";
import {
  changePasswordAction, deleteAccountAction, interestAction, reportAction, updatePrivacyAction, updateProfileAction, uploadPhotoAction,
} from "@/app/actions/member";

type State = ActionResult | null;

export function SubmitButton({ children, className = "btn btn-primary", pendingText = "Please wait…" }: { children: React.ReactNode; className?: string; pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} aria-busy={pending}>
      {pending ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden />{pendingText}</> : children}
    </button>
  );
}

function Feedback({ state }: { state: State }) {
  if (!state?.message) return null;
  return <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert>;
}

function DemoLink({ link }: { link?: string }) {
  if (!link) return null;
  return (
    <Alert tone="info">
      <strong className="font-medium">Demo mode:</strong> transactional email is not connected, so no email was sent. Use this link instead:{" "}
      <Link href={link.replace(/^https?:\/\/[^/]+/, "")} className="underline underline-offset-2">open link</Link>
    </Alert>
  );
}

const err = (s: State, k: string) => s?.errors?.[k];
const invalid = (s: State, k: string) => (err(s, k) ? true : undefined);

/* ---------------- Auth ---------------- */

export function LoginForm() {
  const [state, action] = useActionState<State, FormData>(loginAction, null);
  return (
    <form action={action} className="space-y-5" noValidate>
      <Feedback state={state} />
      <Field label="Email" name="email"><input id="email" name="email" type="email" autoComplete="email" required className="input" /></Field>
      <Field label="Password" name="password"><input id="password" name="password" type="password" autoComplete="current-password" required className="input" /></Field>
      <SubmitButton className="btn btn-primary w-full" pendingText="Signing in…">Sign in</SubmitButton>
      <p className="text-center text-sm text-muted"><Link href="/forgot-password" className="text-champagne hover:underline">Forgot your password?</Link></p>
    </form>
  );
}

export function RegisterForm() {
  const [state, action] = useActionState<State, FormData>(registerAction, null);
  const maxDob = new Date(); maxDob.setUTCFullYear(maxDob.getUTCFullYear() - 18);
  if (state?.ok) {
    return (
      <div className="space-y-4">
        <Alert tone="success">{state.message}</Alert>
        <DemoLink link={state.demoLink} />
        <p className="text-sm text-muted">Once verified, you can <Link href="/login" className="text-champagne underline">sign in</Link>.</p>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-5" noValidate>
      {state && !state.ok && <Alert tone="error">{state.message}</Alert>}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Display name" name="displayName" error={err(state, "displayName")}><input id="displayName" name="displayName" required maxLength={30} autoComplete="nickname" className="input" aria-invalid={invalid(state, "displayName")} /></Field>
        <Field label="Date of birth" name="dob" error={err(state, "dob")} hint="Used to calculate your age. Never shown publicly."><input id="dob" name="dob" type="date" required max={maxDob.toISOString().slice(0, 10)} className="input" aria-invalid={invalid(state, "dob")} /></Field>
      </div>
      <Field label="Email" name="email" error={err(state, "email")} hint="Kept private. Never displayed to other members."><input id="email" name="email" type="email" required autoComplete="email" className="input" aria-invalid={invalid(state, "email")} /></Field>
      <Field label="Password" name="password" error={err(state, "password")} hint="At least 10 characters with upper-case, lower-case and a number."><input id="password" name="password" type="password" required autoComplete="new-password" className="input" aria-invalid={invalid(state, "password")} /></Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="I am a" name="gender" error={err(state, "gender")}>
          <select id="gender" name="gender" required defaultValue="" className="input"><option value="" disabled>Select…</option>{GENDERS.map((g) => <option key={g} value={g}>{GENDER_LABEL[g]}</option>)}</select>
        </Field>
        <Field label="Location" name="city" error={err(state, "city")} hint="General area only. Your precise location is never collected.">
          <select id="city" name="city" required defaultValue="" className="input"><option value="" disabled>Select…</option>{CITY_NAMES.map((c) => <option key={c}>{c}</option>)}</select>
        </Field>
      </div>
      <fieldset>
        <legend className="mb-1.5 text-sm">Interested in</legend>
        <div className="flex flex-wrap gap-2">{GENDERS.map((g) => (
          <label key={g} className="chip cursor-pointer has-[:checked]:border-gold has-[:checked]:bg-gold/10 has-[:checked]:text-champagne">
            <input type="checkbox" name="interestedIn" value={g} className="sr-only" />{GENDER_LABEL[g]}
          </label>))}</div>
        {err(state, "interestedIn") && <p className="mt-1 text-xs text-[#f3a3b5]">{err(state, "interestedIn")}</p>}
      </fieldset>
      <Field label="What are you looking for?" name="intention" error={err(state, "intention")}>
        <select id="intention" name="intention" required defaultValue="" className="input"><option value="" disabled>Select…</option>{INTENTIONS.map((i) => <option key={i} value={i}>{INTENTION_LABEL[i]}</option>)}</select>
      </Field>
      <Field label="Introduce yourself" name="bio" error={err(state, "bio")} hint="20–600 characters. Keep it tasteful and avoid contact details."><textarea id="bio" name="bio" required rows={4} maxLength={600} className="input" aria-invalid={invalid(state, "bio")} /></Field>
      <div className="space-y-3 rounded-xl border border-line p-4 text-sm">
        <label className="flex items-start gap-3"><input type="checkbox" name="confirmAge" className="mt-1 accent-[#b34a67]" required /><span>I confirm that I am 18 years of age or older.</span></label>
        {err(state, "confirmAge") && <p className="text-xs text-[#f3a3b5]">{err(state, "confirmAge")}</p>}
        <label className="flex items-start gap-3"><input type="checkbox" name="acceptTerms" className="mt-1 accent-[#b34a67]" required /><span>I accept the <Link href="/terms" className="text-champagne underline" target="_blank">Terms</Link>, <Link href="/privacy" className="text-champagne underline" target="_blank">Privacy Policy</Link> and <Link href="/guidelines" className="text-champagne underline" target="_blank">Community Guidelines</Link>.</span></label>
        {err(state, "acceptTerms") && <p className="text-xs text-[#f3a3b5]">{err(state, "acceptTerms")}</p>}
        <label className="flex items-start gap-3 text-muted"><input type="checkbox" name="marketingConsent" className="mt-1 accent-[#b34a67]" /><span>Send me occasional product news (optional).</span></label>
      </div>
      <p className="text-xs leading-relaxed text-muted">Age confirmation here is a declaration only. A third-party age-verification provider can be connected before launch (see the README).</p>
      <SubmitButton className="btn btn-primary w-full" pendingText="Creating account…">Create account</SubmitButton>
    </form>
  );
}

export function ForgotForm() {
  const [state, action] = useActionState<State, FormData>(forgotAction, null);
  return (
    <form action={action} className="space-y-5">
      <Feedback state={state} />
      <DemoLink link={state?.demoLink} />
      <Field label="Email" name="email" error={err(state, "email")}><input id="email" name="email" type="email" required className="input" /></Field>
      <SubmitButton className="btn btn-primary w-full">Send reset link</SubmitButton>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [state, action] = useActionState<State, FormData>(resetAction, null);
  if (state?.ok) return <div className="space-y-4"><Alert tone="success">{state.message}</Alert><Link href="/login" className="btn btn-primary">Sign in</Link></div>;
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="token" value={token} />
      {state && <Alert tone="error">{state.message ?? err(state, "password") ?? "Please check your details."}</Alert>}
      <Field label="New password" name="password" hint="At least 10 characters with upper-case, lower-case and a number."><input id="password" name="password" type="password" required autoComplete="new-password" className="input" /></Field>
      <SubmitButton className="btn btn-primary w-full">Set new password</SubmitButton>
    </form>
  );
}

export function ContactForm() {
  const [state, action] = useActionState<State, FormData>(contactAction, null);
  if (state?.ok) return <Alert tone="success">{state.message}</Alert>;
  return (
    <form action={action} className="space-y-5">
      {state?.message && <Alert tone="error">{state.message}</Alert>}
      <Field label="Your name" name="name" error={err(state, "name")}><input id="name" name="name" required className="input" /></Field>
      <Field label="Email" name="email" error={err(state, "email")}><input id="email" name="email" type="email" required className="input" /></Field>
      <Field label="How can we help?" name="message" error={err(state, "message")}><textarea id="message" name="message" rows={5} required className="input" /></Field>
      <SubmitButton>Send message</SubmitButton>
    </form>
  );
}

/* ---------------- Member area ---------------- */

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, action] = useActionState<State, FormData>(updateProfileAction, null);
  const L = profile.lifestyle;
  return (
    <form action={action} className="space-y-6">
      <Feedback state={state} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Display name" name="displayName" error={err(state, "displayName")}><input id="displayName" name="displayName" defaultValue={profile.displayName} className="input" required maxLength={30} /></Field>
        <Field label="Location" name="city"><select id="city" name="city" defaultValue={profile.city} className="input">{CITY_NAMES.map((c) => <option key={c}>{c}</option>)}</select></Field>
      </div>
      <Field label="Looking for" name="intention"><select id="intention" name="intention" defaultValue={profile.intention} className="input">{INTENTIONS.map((i) => <option key={i} value={i}>{INTENTION_LABEL[i]}</option>)}</select></Field>
      <Field label="Biography" name="bio" error={err(state, "bio")}><textarea id="bio" name="bio" defaultValue={profile.bio} rows={5} maxLength={600} className="input" /></Field>
      <Field label="Relationship preferences" name="relationshipPreferences" error={err(state, "relationshipPreferences")}><textarea id="relationshipPreferences" name="relationshipPreferences" defaultValue={profile.relationshipPreferences} rows={2} maxLength={400} className="input" /></Field>
      <fieldset>
        <legend className="mb-1.5 text-sm">Interested in</legend>
        <div className="flex flex-wrap gap-2">{GENDERS.map((g) => (
          <label key={g} className="chip cursor-pointer has-[:checked]:border-gold has-[:checked]:bg-gold/10 has-[:checked]:text-champagne"><input type="checkbox" name="interestedIn" value={g} defaultChecked={profile.interestedIn.includes(g)} className="sr-only" />{GENDER_LABEL[g]}</label>))}</div>
      </fieldset>
      <fieldset>
        <legend className="mb-1.5 text-sm">Interests <span className="text-muted">(up to 12)</span></legend>
        <div className="flex flex-wrap gap-2">{INTERESTS.map((i) => (
          <label key={i} className="chip cursor-pointer has-[:checked]:border-gold has-[:checked]:bg-gold/10 has-[:checked]:text-champagne"><input type="checkbox" name="interests" value={i} defaultChecked={profile.interests.includes(i)} className="sr-only" />{i}</label>))}</div>
        {err(state, "interests") && <p className="mt-1 text-xs text-[#f3a3b5]">{err(state, "interests")}</p>}
      </fieldset>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Smoking" name="smoking"><select id="smoking" name="smoking" defaultValue={L.smoking} className="input"><option value="never">Never</option><option value="socially">Socially</option><option value="regularly">Regularly</option></select></Field>
        <Field label="Drinking" name="drinking"><select id="drinking" name="drinking" defaultValue={L.drinking} className="input"><option value="never">Never</option><option value="socially">Socially</option><option value="regularly">Regularly</option></select></Field>
        <Field label="Children" name="children"><select id="children" name="children" defaultValue={L.children} className="input"><option value="none">None</option><option value="have">Have children</option><option value="want">Want children</option><option value="open">Open to it</option></select></Field>
        <Field label="Exercise" name="fitness"><select id="fitness" name="fitness" defaultValue={L.fitness} className="input"><option value="rarely">Rarely</option><option value="weekly">Weekly</option><option value="daily">Daily</option></select></Field>
      </div>
      <SubmitButton pendingText="Saving…">Save profile</SubmitButton>
    </form>
  );
}

export function PhotoUploadForm() {
  const [state, action] = useActionState<State, FormData>(uploadPhotoAction, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) ref.current?.reset(); }, [state]);
  return (
    <form ref={ref} action={action} className="space-y-3">
      <Feedback state={state} />
      <div className="flex flex-wrap items-center gap-3">
        <input type="file" name="photo" accept="image/jpeg,image/png,image/webp" required aria-label="Choose a photo" className="input max-w-sm file:mr-3 file:rounded-full file:border-0 file:bg-wine file:px-3 file:py-1 file:text-ivory" />
        <SubmitButton className="btn btn-ghost" pendingText="Uploading…">Upload photo</SubmitButton>
      </div>
      <p className="text-xs text-muted">JPEG, PNG or WebP, up to 1 MB. Photos are reviewed before other members can see them. No nudity.</p>
    </form>
  );
}

export function PrivacyForm({ profile, marketing, analytics, canIncognito }: { profile: Profile; marketing: boolean; analytics: boolean; canIncognito: boolean }) {
  const [state, action] = useActionState<State, FormData>(updatePrivacyAction, null);
  const row = "flex items-start justify-between gap-4 rounded-xl border border-line p-4";
  return (
    <form action={action} className="space-y-4">
      <Feedback state={state} />
      <Field label="Profile visibility" name="visibility">
        <select id="visibility" name="visibility" defaultValue={profile.visibility} className="input">
          <option value="members">Visible to all members</option>
          <option value="verified_only">Visible to verified members only</option>
          <option value="hidden">Hidden (not shown in discovery)</option>
        </select>
      </Field>
      <label className={row}><span><span className="block text-sm">Show when I&apos;m online</span><span className="text-xs text-muted">Otherwise others see only &quot;Recently active&quot;.</span></span><input type="checkbox" name="showOnline" defaultChecked={profile.showOnline} className="mt-1 h-4 w-4 accent-[#b34a67]" /></label>
      <label className={row}><span><span className="block text-sm">Show approximate distance</span><span className="text-xs text-muted">Always rounded to the nearest 5 km. Your exact location is never stored.</span></span><input type="checkbox" name="showDistance" defaultChecked={profile.showDistance} className="mt-1 h-4 w-4 accent-[#b34a67]" /></label>
      <label className={row}><span><span className="block text-sm">Incognito browsing {!canIncognito && <span className="chip ml-2">Platinum</span>}</span><span className="text-xs text-muted">View profiles without appearing in their visitors list.</span></span><input type="checkbox" name="incognito" defaultChecked={profile.incognito} disabled={!canIncognito} className="mt-1 h-4 w-4 accent-[#b34a67]" /></label>
      <div className="rule my-2" />
      <p className="eyebrow">Consent</p>
      <label className={row}><span><span className="block text-sm">Product news and offers</span><span className="text-xs text-muted">Optional. Withdraw at any time.</span></span><input type="checkbox" name="marketingConsent" defaultChecked={marketing} className="mt-1 h-4 w-4 accent-[#b34a67]" /></label>
      <label className={row}><span><span className="block text-sm">Anonymous usage analytics</span><span className="text-xs text-muted">Optional. Helps us improve VELVET.</span></span><input type="checkbox" name="analyticsConsent" defaultChecked={analytics} className="mt-1 h-4 w-4 accent-[#b34a67]" /></label>
      <SubmitButton pendingText="Saving…">Save privacy settings</SubmitButton>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState<State, FormData>(changePasswordAction, null);
  return (
    <form action={action} className="space-y-4">
      <Feedback state={state} />
      <Field label="Current password" name="current" error={err(state, "current")}><input id="current" name="current" type="password" autoComplete="current-password" required className="input" /></Field>
      <Field label="New password" name="next" error={err(state, "next")}><input id="next" name="next" type="password" autoComplete="new-password" required className="input" /></Field>
      <SubmitButton className="btn btn-ghost">Change password</SubmitButton>
    </form>
  );
}

export function DeleteAccountForm() {
  const [state, action] = useActionState<State, FormData>(deleteAccountAction, null);
  return (
    <form action={action} className="space-y-4">
      {state?.message && <Alert tone="error">{state.message}</Alert>}
      <p className="text-sm text-muted">This permanently deletes your profile, photos, messages and favourites. It cannot be undone.</p>
      <Field label="Password" name="password" error={err(state, "password")}><input id="password" name="password" type="password" required className="input" /></Field>
      <Field label="Type DELETE to confirm" name="confirm"><input id="confirm" name="confirm" className="input" autoComplete="off" required /></Field>
      <SubmitButton className="btn btn-danger">Delete my account</SubmitButton>
    </form>
  );
}

export function InterestButton({ targetId, sent }: { targetId: string; sent?: boolean }) {
  const [state, action] = useActionState<State, FormData>(interestAction, null);
  return (
    <form action={action} className="inline-flex flex-col gap-1">
      <input type="hidden" name="targetId" value={targetId} />
      <SubmitButton className="btn btn-ghost"><Heart className="h-4 w-4" aria-hidden />{state?.ok ? "Interest sent" : sent ? "Send again" : "Show interest"}</SubmitButton>
      {state?.message && <span className={`text-xs ${state.ok ? "text-emerald-300" : "text-[#f3a3b5]"}`} role="status">{state.message}</span>}
    </form>
  );
}

export function ReportForm({ targetId }: { targetId: string }) {
  const [state, action] = useActionState<State, FormData>(reportAction, null);
  const [open, setOpen] = useState(false);
  if (state?.ok) return <Alert tone="success">{state.message}</Alert>;
  return (
    <div>
      <button type="button" onClick={() => setOpen((o) => !o)} className="btn btn-ghost btn-sm" aria-expanded={open}>Report</button>
      {open && (
        <form action={action} className="card mt-3 space-y-3 p-4">
          <input type="hidden" name="targetId" value={targetId} />
          {state?.message && <Alert tone="error">{state.message}</Alert>}
          <Field label="Reason" name="reason"><select id="reason" name="reason" required defaultValue="" className="input"><option value="" disabled>Select…</option>{Object.entries(REPORT_REASON_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
          <Field label="Details (optional)" name="details"><textarea id="details" name="details" rows={3} maxLength={1000} className="input" /></Field>
          <SubmitButton className="btn btn-primary btn-sm">Submit report</SubmitButton>
        </form>
      )}
    </div>
  );
}

/* ---------------- Messaging ---------------- */

interface ThreadMsg { id: string; mine: boolean; body: string; createdAt: string; read: boolean }
interface Thread { other: { id: string; displayName: string; online: boolean; lastActiveLabel: string }; messages: ThreadMsg[] }

export function ChatPanel({ conversationId, otherId, initial }: { conversationId: string; otherId: string; initial: Thread }) {
  const [thread, setThread] = useState<Thread>(initial);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let stop = false;
    const tick = async () => {
      try {
        const r = await fetch(`/api/messages?c=${encodeURIComponent(conversationId)}`, { cache: "no-store" });
        if (r.ok && !stop) setThread(await r.json());
      } catch { /* offline: retry on next tick */ }
    };
    const t = setInterval(tick, 4000);
    return () => { stop = true; clearInterval(t); };
  }, [conversationId]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [thread.messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true); setError(null);
    try {
      const r = await fetch("/api/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to: otherId, body }) });
      if (!r.ok) { setError((await r.json().catch(() => ({}))).error ?? "Message could not be sent."); return; }
      setText("");
      const t = await fetch(`/api/messages?c=${encodeURIComponent(conversationId)}`, { cache: "no-store" });
      if (t.ok) setThread(await t.json());
    } finally { setSending(false); }
  }

  const fmt = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const lastMineIdx = thread.messages.map((m) => m.mine).lastIndexOf(true);

  return (
    <div className="flex h-[70vh] min-h-[420px] flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto px-1 py-2" aria-live="polite" role="log" aria-label="Conversation">
        {thread.messages.map((m, i) => (
          <div key={m.id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${m.mine ? "rounded-br-sm bg-gradient-to-br from-burgundy to-wine text-ivory" : "rounded-bl-sm border border-line bg-raised"}`}>
              <p className="whitespace-pre-wrap break-words">{m.body}</p>
              <p className="mt-1 text-[0.68rem] text-ivory/60">{fmt(m.createdAt)}{m.mine && i === lastMineIdx ? (m.read ? " · Read" : " · Delivered") : ""}</p>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      {error && <div className="mb-2"><Alert tone="error">{error}</Alert></div>}
      <form onSubmit={send} className="mt-2 flex gap-2">
        <label htmlFor="msg" className="sr-only">Message</label>
        <input id="msg" value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} placeholder={`Message ${thread.other.displayName}…`} className="input" autoComplete="off" />
        <button className="btn btn-primary" disabled={sending || !text.trim()} aria-label="Send message"><Send className="h-4 w-4" aria-hidden /></button>
      </form>
    </div>
  );
}

export function NewMessageForm({ targetId, name }: { targetId: string; name: string }) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true); setError(null);
    const r = await fetch("/api/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to: targetId, body: text }) });
    const j = await r.json().catch(() => ({}));
    setSending(false);
    if (!r.ok) return setError(j.error ?? "Message could not be sent.");
    window.location.href = `/dashboard/messages/${j.conversationId}`;
  }
  return (
    <form onSubmit={send} className="space-y-3">
      {error && <Alert tone="error">{error}</Alert>}
      <label htmlFor="firstmsg" className="sr-only">Message to {name}</label>
      <textarea id="firstmsg" value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={2000} placeholder={`Say hello to ${name}…`} className="input" />
      <button className="btn btn-primary" disabled={sending || !text.trim()}><Send className="h-4 w-4" aria-hidden />Send message</button>
    </form>
  );
}
