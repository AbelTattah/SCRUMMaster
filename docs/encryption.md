# Scrum Master — End-to-End Encryption & Offline-First Architecture

Task content is encrypted in the browser **before it reaches Supabase**. The
server stores only ciphertext and metadata it legitimately needs (times,
status, assignees, counts) — it can never read a task title or blocker. The
same encrypted dataset is mirrored locally in IndexedDB, so the app is
instant and fully usable with no network.

---

## 1. Key hierarchy

```mermaid
flowchart TB
    P["👤 Account password"] -->|"PBKDF2-SHA256 · 310k iters · crypto_salt"| KEK["KEK (AES-GCM-256)"]
    M["🔑 24-word recovery phrase<br/>(shown once at sign-up)"] -->|"PBKDF2 · same salt"| RKEK["Recovery KEK"]

    KEK -->|"wraps"| PKG["Key package { DEK, identity private key }<br/>user_metadata.crypto_wrapped"]
    RKEK -->|"wraps (same package)"| REC["user_metadata.crypto_recovery"]

    PKG --> DEK["DEK — content key<br/>(personal accounts)"]
    PKG --> PRIV["ECDH P-256 private key<br/>(wrapped, never leaves the device)"]

    DEK -->|"wraps"| ORG["Organization key<br/>user_metadata.crypto_org_wrapped (owner)"]
    PRIV -.->|"ECDH + HKDF grant"| ORGM["Organization key<br/>user_metadata.crypto_org_grant (member)"]

    DEK -->|"AES-GCM"| TASK_P["Personal task text"]
    ORG -->|"AES-GCM"| TASK_O["Organization task text"]

    PUB["user_metadata.crypto_pub<br/>(raw public key, plain)"] -.->|"addressed by"| ORG
```

| Piece | Algorithm | Stored where | Server can read it? |
|---|---|---|---|
| KEK | PBKDF2-SHA256, 310 000 iters, 16-byte salt | derived, never stored | ❌ needs the password |
| Key package `{dek, priv}` | AES-GCM under KEK | `user_metadata.crypto_wrapped` | ❌ ciphertext |
| Recovery copy of the package | AES-GCM under PBKDF2(mnemonic, salt) | `user_metadata.crypto_recovery` | ❌ ciphertext |
| Salt | random 16 bytes | `user_metadata.crypto_salt` | ✓ (harmless) |
| Identity public key | ECDH P-256, raw | `user_metadata.crypto_pub` | ✓ (by design) |
| Organization key (owner) | AES-GCM under DEK | `user_metadata.crypto_org_wrapped` | ❌ ciphertext |
| Organization key grant (member) | ECIES: ephemeral ECDH → HKDF-SHA256 → AES-GCM | member's `crypto_org_grant` = `v1.<ephPub>.<iv‖ct>` | ❌ ciphertext |
| Task title / blocker | AES-GCM under DEK **or** org key | `todos.title`, `todos.blocker` | ❌ ciphertext |

**Task field envelope** (what a row actually stores):

```
enc:v1:Zm9vYmFy…            ←  "enc:v1:" + base64( 12-byte IV ‖ AES-GCM(ciphertext ‖ 16-byte tag) )
```

Values **without** the `enc:v1:` prefix are legacy plaintext from builds
before encryption — they keep rendering as-is and are transparently
re-encrypted on the next sync (see §5, migration pass).

---

## 2. Who holds which key

```mermaid
flowchart LR
    subgraph Device["Device (browser / Electron)"]
      IDB["IndexedDB 'scrum-master'<br/>keys · material cache · encrypted mirror · outbox"]
      MEM["Unlocked session (memory)"]
    end
    subgraph Server["Supabase (zero-knowledge)"]
      UM["auth.users.user_metadata<br/>salt · wrapped package · pub · grants"]
      TD["todos (ciphertext)"]
    end

    P2["password at sign-in"] -->|KEK| MEM
    IDB -.->|"fast path: no prompt"| MEM
    MEM -->|"encrypt"| TD
    MEM -->|"decrypt at display"| IDB
    UM -->|"wrapped blobs only"| MEM
```

- **Unlocked keys live in memory + IndexedDB** (this device only) so return
  visits open silently; sign-out drains the outbox, then wipes both.
- The server holds only wrapped blobs — losing the server leaks nothing
  readable; losing **both** password and recovery phrase loses the content
  (the tradeoff below).

---

## 3. The org key: admin access without breaking zero-knowledge

The requirement: *the organization owner must still open every member's
tasks as usual.* One random organization key provides that — and it is
distributed without the server ever seeing it:

```mermaid
sequenceDiagram
    participant O as Owner (browser)
    participant S as Supabase
    participant M as Member (browser)

    Note over O: first unlock → mint org key,<br/>wrap under own DEK, save
    O->>S: crypto_org_wrapped (ciphertext)
    S-->>O: (owner reads it back — session adopts THIS value)

    Note over O: member joins / pending flag seen
    O->>S: read member's crypto_pub (plain)
    O->>O: ECIES(pub) → v1.ephPub.wrap(orgKey)
    O->>S: member's crypto_org_grant = v1.…
    S-->>M: grant on next unlock
    M->>M: ECDH(own priv, ephPub) → org key
    Note over M: can now decrypt every org task<br/>(and only while still a member)
```

**Safety invariants** (these exist because a re-mint once orphaned tasks):

1. The owner path **re-reads the server** before ever minting — a stale
   local cache can never trigger a replacement key.
2. `saveCryptoMaterial` **refuses to overwrite** an existing
   `crypto_org_wrapped` with a different value (covers racing unlocks).
3. After saving, the session **adopts whatever the server kept** — every
   unlock converges on the one stored key.
4. If a stored wrap exists but will not open, the gate reports the error
   instead of minting (never silently break existing ciphertext).

Removing a member revokes future access at the data-serving layer (rows stop
being sent); the member's cached copy is purged on their next sync pull.

---

## 4. Sign-in / sign-up: key lifecycle

```mermaid
flowchart TD
    A["Sign up (step 1)"] -->|"client: createAccountMaterial(password)"| B["salt · wrapped package · pub · 24-word phrase"]
    B -->|"registerStepOne stores blobs"| C["keys → IndexedDB<br/>phrase stashed for step 2"]
    C --> D["Step 2: phrase shown (Copy button + confirm checkbox)"]
    D -->|completeRegistration saves crypto_recovery| E["App opens directly — already unlocked"]

    F["Sign in"] --> G{"material on server?"}
    G -->|yes| H["KEK → unwrap package → session"]
    G -->|"no (pre-encryption account)"| I["provisionAndUnlock:<br/>derive from this password, save blobs"]
    G -->|"no password at all"| J["Generated sign-in key<br/>(Copy button) → provisionPassword<br/>password + material in ONE action"]
    H --> K["Device already has keys?<br/>→ silent restore, no prompt"]
    I --> K
    K --> L["App"]
    L -.->|"new device, session but no local keys"| M["Sign-in-styled password step<br/>(same card as /login)"]
```

- Everything key-related happens **inside the sign-in/sign-up form submit** —
  there is no extra “unlock” round for normal logins.
- **Legacy accounts** sign in with their existing password; keys are derived
  from it automatically and their plaintext todos keep working (§5).

---

## 5. Offline-first sync loop

```mermaid
flowchart TD
    U["UI edit (title · time · toggle · blocker · delete)"] --> EN["Encrypt with contentKey<br/>orgKey ?? DEK"]
    EN --> LOC["Write to IndexedDB mirror<br/>→ list re-renders instantly"]
    LOC --> OUT["Outbox op (coalesced, full row state,<br/>idempotent — one per todo)"]
    OUT -->|"online · interval · focus"| PUSH["pushTodos() server action<br/>same authz rules as the inline editors"]
    PUSH -->|"per-op ack"| DONE["op dropped · dirty cleared"]
    PUSH -->|reject| ERR["op dropped · inline banner · re-pull"]

    START["App start / 'online' event"] --> PULL["pull: loadTodosSync / loadTeamTodosSync"]
    PULL --> MERGE["Merge: server rows land unless<br/>this device has pending local changes"]
    MERGE --> MIG["migrateLegacyRows(): any plaintext row<br/>→ re-encrypt with current key → enqueue push"]
    MIG --> DONE
```

| Property | Behaviour |
|---|---|
| Writes while offline | Applied locally, queued, flushed on reconnect — never lost |
| Conflicts | Last successful push wins; a device with pending ops keeps its own copy until pushed |
| Idempotency | Ops carry full row state and coalesce per todo → safe to retry |
| Search / tab filters | Client-side over decrypted text (the server *cannot* search ciphertext) |
| Sign-out | Best-effort drain → wipe mirror, outbox, keys → session ends |

## 6. Where decryption happens (display boundary only)

| Surface | Behaviour |
|---|---|
| Home & team lists (`TaskBoard`) | Mirror rows decrypted on load; server passes ciphertext |
| Row editing (`TaskRow`, composer, toggle) | Encrypts before local write; server never sees plaintext |
| Reports | `ReportClient` decrypts rows; **PDF is generated in the browser with jsPDF** (the server can't read titles) |
| Bell popup / notifications page / OS alerts | `decorateNotification()` decrypts title and composes `Blocked — …` client-side |
| Digest email & web push | **Counts only** ("3 overdue") — crosses the server, which cannot read titles |
| Sidebar counts, nudge logic, scheduling | Plaintext *metadata* only (completed, times, created_at) — unchanged |

## 7. Password & recovery flows

```mermaid
flowchart TD
    PC["Change password (logged in)"] --> PC1["re-wrap package under new KEK<br/>SALT UNCHANGED → recovery phrase keeps working"]
    PC1 --> PC2["one server action: verify old → update password → save blob"]

    R1["Reset via email link"] --> R2{"recovery phrase entered?"}
    R2 -->|yes| R3["unwrap package with phrase<br/>re-wrap under new password (same salt)<br/>→ every task stays readable"]
    R2 -->|no| R4["fresh package installed<br/>old ciphertext permanently unreadable<br/>(explicitly warned before submitting)"]
    R3 --> R5["org grant preserved"]
    R4 --> R6["org grant cleared → owner re-grants on next session"]
```

- The **24-word phrase** shown at sign-up (with a **Copy** button and a
  required “I saved it” checkbox) is the only recovery path for a lost
  password — that is the deliberate tradeoff of zero-knowledge.

## 8. Accepted tradeoffs (by design)

- ❌ **No server-side text search** — filtering runs on decrypted data in
  the client (the dataset per user is small by design).
- ❌ **No task titles in server-generated email/push** — digests carry counts
  and a link; titles appear only in client-decrypted surfaces.
- ⚠️ **Lost password + lost phrase = lost content** — the server holds only
  ciphertext by construction.
- ✅ **Admin/org access preserved** — the org key (owner mint, member
  grants) keeps organization-wide views, assignments and reports working.
- ✅ **Offline** — full read/write with no network; background sync when
  back.

---

*Implementation: `src/lib/crypto.ts` (primitives), `src/lib/keys.ts`
(lifecycle + org handshake), `src/lib/localdb.ts` (mirror/outbox),
`src/lib/sync.ts` (encrypt → local → push, migration), `src/app/actions/crypto.ts`
+ `src/app/actions/sync.ts` (server side, ciphertext only),
`src/components/CryptoGate.tsx` (unlock states).*
