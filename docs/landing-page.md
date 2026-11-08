# Landing Page — Scrum Master

A ready-to-use content brief for a marketing/landing page for **Scrum Master**.
Target audience: solo professionals, small teams, and small orgs that want a
fast, private, offline-capable task manager with stand-up reports.

Live app: https://scrum-master-two.vercel.app
Desktop: Windows installer (Electron shell)

---

## Brand basics

- **Name:** Scrum Master
- **Tagline (short):** Record what gets done, stay accountable, and level up every day.
- **Tagline (long):** Your tasks, your team, your stand-up report — private by default, works offline, available anywhere.
- **Manifest description:** "Record what gets done, stay accountable, and level up every day."
- **Categories:** Productivity · Business
- **Tone:** Calm, professional, confident, privacy-first. Short sentences. No jargon.
- **Primary color:** `#21005D` (deep purple) · Accent on dark: `#B9A6F5`
- **Font:** Poppins (self-hosted, offline-capable)

---

## Hero section

**Headline (option A):**
> Get things done. Stay accountable. Level up every day.

**Headline (option B):**
> A task manager that keeps your team honest — and your data private.

**Sub-headline:**
> Scrum Master is a fast, offline-first task manager for you and your team.
> Track today's work, assign it to anyone (even before they sign up),
> get reminded before tasks start, and ship a stand-up report — PDF or Word —
> in one click. Your task titles are end-to-end encrypted; we can't read them.

**Primary CTA:** `Start for free` → /register
**Secondary CTA:** `See how it works` → #how-it-works
**Tertiary:** `Download the desktop app` → #download

**Hero visual suggestion:** animated screenshot of the Today board with sticky
notes popping out, plus the offline pill in the header. Show the encryption
badge ("Zero-knowledge").

---

## Social proof / trust strip

- "Works offline — your tasks are always with you"
- "End-to-end encrypted — zero-knowledge"
- "PDF + Word stand-up reports"
- "Desktop app available"
- "No credit card to start"

---

## Problem → solution

**The problem (3 bullets):**
- Tasks live in too many places — chat, spreadsheets, sticky notes — and
  nobody knows what's actually done.
- Stand-up reports get written by hand, out of stale memory.
- Team tools force everyone to create accounts before they can be assigned work.

**The solution (3 bullets):**
- One board for today. Inline editing, no modals, no friction.
- Stand-up reports generated from real task data — PDF and Word, in one click.
- Add teammates by email and assign tasks immediately. They pick everything
  up when they first sign in.

---

## Feature sections

### 1. Today's board — built for speed

- Everything you need to do today, on one screen.
- Inline editing: rename, set times, assign — no modals, no dialogs.
- One-click checkbox that sticks (offline-first, syncs in the background).
- Filter by All / In Progress / Completed; search across tasks.
- Pagination for long lists.
- Sticky notes: pop today's tasks into a floating mini-window (Picture-in-Picture)
  that stays on top while you work in other apps. Auto-opens when you switch away.

### 2. Never miss a thing

- Reminders before a task starts (configurable lead time).
- Overdue, upcoming and blocker alerts in a dedicated Notifications screen.
- Browser push notifications + email digests.
- A "nudge" when you haven't created any tasks today.
- Offline status shown as a quiet header pill — never a blocking overlay.

### 3. Teams without the friction

- Create an organization in seconds.
- Invite members by email — no account required on their side yet.
- Assign and update tasks for them right away.
- Members unlock encrypted org tasks automatically when they first sign in.
- XP + levels for completed tasks; a leaderboard for the team.
- Org owners see every task; members see their own.

### 4. Stand-up reports, generated for you

- Daily, weekly or monthly windows (by task creation time).
- Stand-up format: header block, attendance, individual progress updates,
  blockers & dependencies, action items, meeting summary, prepared-by footer.
- Titles and blockers stay encrypted client-side; the server only ever sees
  ciphertext.
- Export to **PDF** and **Word (.docx)**.
- Org owners can download org-wide reports; members see their own.
- Share-ready formatting — no Word "repair content" prompts.

### 5. Private by design (zero-knowledge)

- Task titles and blockers are end-to-end encrypted in the browser.
- The server stores ciphertext only. We cannot read your tasks.
- Recovery via a 24-word phrase; auto-generated sign-in key with a copy button
  for password-less accounts.
- Backwards compatible with legacy plaintext — no migration step required.
- Admins and org owners keep access to all org tasks.

### 6. Works offline, everywhere

- Tasks live in an encrypted local mirror (IndexedDB).
- Create, edit, complete and delete with or without a connection.
- Changes queue and sync automatically when you're back online.
- Desktop app (Electron) for Windows — install once, work anywhere.

### 7. Gamification that motivates

- +10 XP per completed task.
- A level every 250 XP.
- Team leaderboard with top-3 highlighting.

---

## How it works (3 steps)

1. **Sign up in seconds.** Create your account — we generate an encryption key
   from your password and a 24-word recovery phrase. No setup wizard.
2. **Add your tasks.** Type a title, press Enter. Set times, assign teammates
   (even ones without accounts yet). Everything encrypts in the browser.
3. **Report and share.** Pick a period, generate a stand-up report, export to
   PDF or Word. Send it to your team or your manager.

---

## Platforms

- **Web:** https://scrum-master-two.vercel.app (PWA — installable)
- **Desktop:** Windows installer (Electron) — offline-first, native window
- **Mobile-friendly:** responsive web app, bottom tab bar on phones

---

## Security & privacy section

- End-to-end encryption of task titles and blockers (AES-GCM, AES-256-GCM).
- KEK derived via PBKDF2 (310,000 iterations) from your password.
- Recovery phrase (BIP-39, 24 words) wraps the same key package.
- Org keys minted by the owner; members receive an ECDH grant.
- Zero-knowledge: the server never sees plaintext.
- Legacy plaintext auto-re-encrypts on sync — no migration step.
- Admins and org owners retain access to all org tasks.

---

## Download section

**Desktop app (Windows)**
- Offline-first, native window, same account.
- Download installer: `Scrum Master Setup 0.1.0.exe`
- Smoke-tested; manual install fallback documented.

---

## FAQ

**Q: Is my data really private?**
A: Yes. Task titles and blockers are encrypted in your browser before they
leave your device. We store ciphertext only.

**Q: Does it work offline?**
A: Yes. Tasks are stored in an encrypted local mirror. Create, edit and
complete tasks with no connection; they sync when you're back online.

**Q: Can I assign tasks to people who don't have accounts?**
A: Yes. Add a teammate by email and assign tasks immediately. They pick
everything up when they first sign in.

**Q: What report formats are supported?**
A: PDF and Word (.docx), in daily, weekly and monthly windows. Owners can
download org-wide reports.

**Q: What if I forget my password?**
A: Use your 24-word recovery phrase to restore access. Password-less accounts
get an auto-generated sign-in key you can copy.

**Q: Is there a mobile app?**
A: The web app is responsive and installable as a PWA on phones and tablets.
A native mobile app is on the roadmap.

---

## Footer

- Links: Home · Features · Security · Reports · Download · Sign in · Sign up
- Legal: Privacy · Terms
- © Scrum Master
- Contact: support (email)

---

## Suggested page structure (top → bottom)

1. Top nav (logo, Features, Security, Reports, Download, Sign in, Get started)
2. Hero (headline, sub, CTAs, hero visual)
3. Trust strip (offline · encrypted · reports · desktop)
4. Problem → solution
5. Feature grid (7 cards)
6. How it works (3 steps)
7. Stand-up report showcase (screenshot + PDF/Word badges)
8. Security & privacy
9. Platforms (web · desktop · mobile)
10. Testimonial / quote (optional)
11. FAQ accordion
12. Final CTA ("Start for free")
13. Footer

---

## Visual notes

- Hero background: deep purple `#21005D` gradient with soft purple glow.
- Cards: white surface, 12px radius, subtle shadow, 1px border.
- Typography: Poppins 600 for headings, 400 for body, 14px base.
- Spacing: 8pt system (8 / 16 / 24 / 32 / 48).
- Dark mode supported (follows system preference).
- Sticky-note motif: pastel cards with slight rotation, used as a recurring
  visual accent (matches the in-app sticky notes feature).

---

## Assets needed

- Hero screenshot (Today board + sticky notes popping out)
- Report screenshot (stand-up document)
- Notifications screenshot
- Team/leaderboard screenshot
- Encryption diagram (password → KEK → DEK → encrypted task)
- Logo wordmark (light + dark variants) — already in `/public`
- App icons (192/512) — already in `/public/icons`
- Desktop installer file
