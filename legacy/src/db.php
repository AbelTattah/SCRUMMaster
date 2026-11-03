<?php

/**
 * src/db.php
 *
 * PDO connection + schema (with lightweight migrations for the original
 * todos table, which predates the homepage redesign).
 */

declare(strict_types=1);

// Absolute path from the project root — independent of the working directory,
// so the app always opens the SAME database file (a relative path used to
// silently create an empty database somewhere else).
$db = new PDO('sqlite:' . ROOT_PATH . '/storage/database.sqlite');

// Throw exceptions instead of failing silently (PDO's default error mode is
// ERRMODE_SILENT, which hides SQL errors completely).
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

// ---------------------------------------------------------------------------
// Todos
// ---------------------------------------------------------------------------
// New installs get the full schema straight away...
$db->exec("
    CREATE TABLE IF NOT EXISTS todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        completed INTEGER DEFAULT 0,
        start_time TEXT,
        end_time TEXT
    )
");

// ...and older databases (the ones created before the redesign) are migrated
// in place so no existing data is lost.
$columns = array_column($db->query('PRAGMA table_info(todos)')->fetchAll(), 'name');

if (!in_array('start_time', $columns, true)) {
    $db->exec('ALTER TABLE todos ADD COLUMN start_time TEXT');
}

if (!in_array('end_time', $columns, true)) {
    $db->exec('ALTER TABLE todos ADD COLUMN end_time TEXT');
}

// ---------------------------------------------------------------------------
// Accounts: organizations + users
// ---------------------------------------------------------------------------
// An organization is owned by exactly one user (organizations.owner_id) and
// members are associated by setting users.organization_id. The two tables
// reference each other, so integrity is enforced by the application (SQLite
// does not enable foreign keys by default and this app never deletes a user
// while keeping an organization alive).
$db->exec("
    CREATE TABLE IF NOT EXISTS organizations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        owner_id INTEGER NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
");

// Email is stored lower-cased and is unique across the installation.
// password_hash holds the output of password_hash() — never a plain password.
$db->exec("
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        avatar TEXT,
        organization_id INTEGER,
        notify_browser INTEGER NOT NULL DEFAULT 1,
        notify_email INTEGER NOT NULL DEFAULT 1,
        notify_lead_minutes INTEGER NOT NULL DEFAULT 30,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
");

$db->exec('CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users (email)');
$db->exec('CREATE INDEX IF NOT EXISTS users_organization_id ON users (organization_id)');

// Google sign-in: users.google_id holds the Google account id ("sub"). Accounts
// created with Google have no password (password_hash stays ''), so signing in
// with a password is refused for them until one is set on the profile page.
$userColumns = array_column($db->query('PRAGMA table_info(users)')->fetchAll(), 'name');

if (!in_array('google_id', $userColumns, true)) {
    $db->exec('ALTER TABLE users ADD COLUMN google_id TEXT');
}

// SQLite allows any number of NULLs in a unique index, so unlinked accounts
// are unaffected.
$db->exec('CREATE UNIQUE INDEX IF NOT EXISTS users_google_id_unique ON users (google_id)');

// Notification preferences. Existing accounts keep both channels on and get
// the default 30-minute reminder window.
if (!in_array('notify_browser', $userColumns, true)) {
    $db->exec('ALTER TABLE users ADD COLUMN notify_browser INTEGER NOT NULL DEFAULT 1');
}

if (!in_array('notify_email', $userColumns, true)) {
    $db->exec('ALTER TABLE users ADD COLUMN notify_email INTEGER NOT NULL DEFAULT 1');
}

if (!in_array('notify_lead_minutes', $userColumns, true)) {
    $db->exec('ALTER TABLE users ADD COLUMN notify_lead_minutes INTEGER NOT NULL DEFAULT 30');
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------
// Notifications are derived from the clock and the open todos on every
// request; only the "read" and "emailed" markers are stored. The key is
// "todo:{id}:{kind}" so one task can be a reminder today and overdue later
// without the two states overwriting each other.
$db->exec("
    CREATE TABLE IF NOT EXISTS notification_state (
        user_id INTEGER NOT NULL,
        notification_key TEXT NOT NULL,
        read_at TEXT,
        emailed_at TEXT,
        PRIMARY KEY (user_id, notification_key)
    )
");

// Every todo now belongs to one user. Existing rows (from before accounts
// existed) keep user_id = NULL until the first account is created; that
// account adopts them, so no task is ever lost.
if (!in_array('user_id', $columns, true)) {
    $db->exec('ALTER TABLE todos ADD COLUMN user_id INTEGER');
}

$db->exec('CREATE INDEX IF NOT EXISTS todos_user_id ON todos (user_id)');

// ---------------------------------------------------------------------------
// Legacy profile
// ---------------------------------------------------------------------------
// The single profile row from the pre-auth version. It is no longer used for
// rendering: it only supplies the name/avatar of the very first account (the
// one that adopts the existing tasks) and is kept untouched otherwise.
$db->exec("
    CREATE TABLE IF NOT EXISTS profiles (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        name TEXT NOT NULL,
        avatar TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
");
