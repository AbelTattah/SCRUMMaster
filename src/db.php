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
// Profile
// ---------------------------------------------------------------------------
// Single-row table (id = 1 is enforced by the CHECK constraint): this is a
// local, auth-less app — one profile per installation. Persisting the profile
// in the database (rather than only in the session) means the name and avatar
// survive session expiry; the browser cookie only identifies the visitor.
$db->exec("
    CREATE TABLE IF NOT EXISTS profiles (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        name TEXT NOT NULL,
        avatar TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
");
