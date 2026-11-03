/**
 * Migrate the legacy PHP/SQLite data into Supabase.
 *
 *   npm run migrate:legacy
 *
 * Accounts are created in Supabase Auth with a random password (the PHP
 * bcrypt hashes cannot be reused). A password-recovery link is generated for
 * every migrated account and written to legacy/migration-reset-links.txt.
 *
 * The script is idempotent: profiles are upserted, organizations are matched
 * by owner + name, and todos are matched by (user_id, legacy_id).
 */

import { createHash, randomBytes } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

const root = process.cwd();
const dbPath = path.join(root, "legacy", "storage", "database.sqlite");
const avatarRoot = path.join(root, "legacy", "public");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

if (!existsSync(dbPath)) {
  console.error(`Legacy database not found at ${dbPath}.`);
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const db = new DatabaseSync(dbPath, { readOnly: true });

function all(sql) {
  return db.prepare(sql).all();
}

function clock(value) {
  return value ? `${String(value).replace(" ", "T")}Z` : new Date().toISOString();
}

async function listUsers() {
  const users = [];
  let page = 1;

  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });

    if (error) {
      throw error;
    }

    users.push(...data.users);

    if (data.users.length < 1000) {
      break;
    }

    page += 1;
  }

  return users;
}

async function ensureOrganization(name, ownerId, createdAt) {
  const { data: existing, error: findError } = await admin
    .from("organizations")
    .select("id")
    .eq("owner_id", ownerId)
    .ilike("name", name)
    .maybeSingle();

  if (findError) {
    throw findError;
  }

  if (existing) {
    return existing.id;
  }

  const { data, error } = await admin
    .from("organizations")
    .insert({ name, owner_id: ownerId, created_at: createdAt })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return data.id;
}

function contentTypeFor(file) {
  const extension = path.extname(file).toLowerCase();

  return extension === ".png"
    ? "image/png"
    : extension === ".webp"
      ? "image/webp"
      : extension === ".gif"
        ? "image/gif"
        : "image/jpeg";
}

async function main() {
  const legacyUsers = all("SELECT * FROM users ORDER BY id");
  const legacyOrganizations = all("SELECT * FROM organizations ORDER BY id");
  const legacyTodos = all("SELECT * FROM todos ORDER BY id");

  console.log(`Found ${legacyUsers.length} users, ${legacyOrganizations.length} organizations, ${legacyTodos.length} todos.`);

  const existingUsers = await listUsers();
  const byEmail = new Map(
    existingUsers.filter((user) => user.email).map((user) => [user.email.toLowerCase(), user]),
  );

  const userIds = new Map();
  const passwords = new Map();
  const createdProfiles = new Map();

  for (const legacy of legacyUsers) {
    const email = String(legacy.email).trim().toLowerCase();
    let authUser = byEmail.get(email);

    if (!authUser) {
      const password = randomBytes(24).toString("base64url");
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name: legacy.name },
      });

      if (error || !data.user) {
        throw new Error(`Could not create ${email}: ${error?.message ?? "unknown error"}`);
      }

      authUser = data.user;
      byEmail.set(email, authUser);
      passwords.set(email, password);
      console.log(`  created auth user ${email}`);
    } else {
      console.log(`  reusing auth user ${email}`);
    }

    userIds.set(legacy.id, authUser.id);
    createdProfiles.set(legacy.id, clock(legacy.created_at));

    const { error: profileError } = await admin.from("profiles").upsert(
      {
        id: authUser.id,
        name: String(legacy.name),
        email,
        notify_browser: Number(legacy.notify_browser ?? 1) === 1,
        notify_email: Number(legacy.notify_email ?? 1) === 1,
        notify_lead_minutes: Number(legacy.notify_lead_minutes ?? 30),
        onboarding_complete: true,
        created_at: clock(legacy.created_at),
      },
      { onConflict: "id" },
    );

    if (profileError) {
      throw profileError;
    }

    if (legacy.avatar) {
      const source = path.join(avatarRoot, String(legacy.avatar));

      if (existsSync(source)) {
        const extension = path.extname(source) || ".png";
        const objectPath = `${authUser.id}/legacy-${createHash("sha1")
          .update(readFileSync(source))
          .digest("hex")
          .slice(0, 12)}${extension}`;

        const { error: uploadError } = await admin.storage
          .from("avatars")
          .upload(objectPath, readFileSync(source), {
            contentType: contentTypeFor(source),
            upsert: true,
          });

        if (uploadError) {
          console.warn(`  ! avatar upload failed for ${email}: ${uploadError.message}`);
        } else {
          const { data } = admin.storage.from("avatars").getPublicUrl(objectPath);

          await admin
            .from("profiles")
            .update({ avatar_url: data.publicUrl })
            .eq("id", authUser.id);

          console.log(`  uploaded avatar for ${email}`);
        }
      } else {
        console.warn(`  ! avatar file missing: ${source}`);
      }
    }
  }

  const organizationIds = new Map();

  for (const organization of legacyOrganizations) {
    const ownerId = userIds.get(organization.owner_id);

    if (!ownerId) {
      console.warn(`  ! skipping organization ${organization.name}: owner not migrated`);
      continue;
    }

    const id = await ensureOrganization(
      String(organization.name),
      ownerId,
      clock(organization.created_at),
    );

    organizationIds.set(organization.id, id);
    console.log(`  organization ${organization.name} -> ${id}`);
  }

  for (const legacy of legacyUsers) {
    const userId = userIds.get(legacy.id);
    const organizationId = legacy.organization_id
      ? organizationIds.get(legacy.organization_id) ?? null
      : null;

    const { error } = await admin
      .from("profiles")
      .update({ organization_id: organizationId })
      .eq("id", userId);

    if (error) {
      throw error;
    }
  }

  let insertedTodos = 0;
  let updatedTodos = 0;

  for (const todo of legacyTodos) {
    const userId = userIds.get(todo.user_id);

    if (!userId) {
      console.warn(`  ! skipping todo ${todo.id}: owner not migrated`);
      continue;
    }

    const createdAt = new Date(
      new Date(createdProfiles.get(todo.user_id)).getTime() + Number(todo.id) * 1000,
    ).toISOString();

    const values = {
      title: String(todo.title),
      completed: Number(todo.completed) === 1,
      start_time: todo.start_time ? `${todo.start_time}:00` : null,
      end_time: todo.end_time ? `${todo.end_time}:00` : null,
      created_at: createdAt,
    };

    const { data: existing } = await admin
      .from("todos")
      .select("id")
      .eq("user_id", userId)
      .eq("legacy_id", todo.id)
      .maybeSingle();

    if (existing) {
      const { error } = await admin.from("todos").update(values).eq("id", existing.id);

      if (error) {
        throw error;
      }

      updatedTodos += 1;
    } else {
      const { error } = await admin.from("todos").insert({
        ...values,
        user_id: userId,
        legacy_id: todo.id,
      });

      if (error) {
        throw error;
      }

      insertedTodos += 1;
    }
  }

  const resetLines = [
    "Scrum Master — password reset links for migrated accounts",
    "Generated " + new Date().toISOString(),
    "",
    "Legacy PHP passwords cannot be reused with Supabase Auth. Open each link",
    "below (they are single-use and expire) to choose a new password.",
    "",
  ];

  for (const legacy of legacyUsers) {
    const email = String(legacy.email).trim().toLowerCase();
    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: `${siteUrl}/reset-password` },
    });

    const tokenHash = data?.properties?.hashed_token;

    if (error || !tokenHash) {
      resetLines.push(`${legacy.name} <${email}>: could not generate a link (${error?.message ?? "unknown"})`);
      continue;
    }

    resetLines.push(
      `${legacy.name} <${email}>`,
      `${siteUrl}/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}&type=recovery&next=%2Freset-password`,
      "",
    );
  }

  const linksPath = path.join(root, "legacy", "migration-reset-links.txt");
  writeFileSync(linksPath, resetLines.join("\n"), "utf8");

  console.log("");
  console.log(`Todos: ${insertedTodos} inserted, ${updatedTodos} updated.`);
  console.log(`Reset links written to ${linksPath}.`);
  console.log(`Temporary passwords were generated for ${passwords.size} new accounts.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.close());
