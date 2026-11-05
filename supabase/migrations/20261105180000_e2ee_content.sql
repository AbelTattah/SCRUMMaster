-- End-to-end encrypted task content.
--
-- Titles and blockers are AES-GCM encrypted in the browser before they reach
-- the database (the server never sees plaintext task text), and ciphertext is
-- longer than the old plaintext limits — a 200-character title becomes ~304
-- base64 characters. Relax the checks to fit the encrypted envelope.
--
-- Existing rows are untouched: plaintext written by older builds still satisfies
-- these checks (backwards compatible), and the app treats any value without the
-- "enc:v1:" envelope prefix as legacy plaintext.

alter table todos drop constraint if exists todos_title_check;
alter table todos
  add constraint todos_title_check check (char_length(title) between 1 and 2000);

alter table todos drop constraint if exists todos_blocker_check;
alter table todos
  add constraint todos_blocker_check check (char_length(blocker) <= 2500);
