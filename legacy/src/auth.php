<?php

/**
 * src/auth.php
 *
 * Session-based authentication and organization helpers.
 *
 * The session only stores the user id; everything else is read from the
 * database on each request so a changed name/avatar/organization is visible
 * immediately. Passwords are never stored — only password_hash() output.
 */

declare(strict_types=1);

/** How many failed sign-ins are allowed before a short cool-down. */
const AUTH_MAX_ATTEMPTS = 5;

/** Cool-down window in seconds (10 minutes). */
const AUTH_ATTEMPT_WINDOW = 600;

/**
 * The signed-in user (with organization name/owner joined in), or null.
 */
function auth_user(): ?array
{
    static $loaded = false;
    static $user = null;

    if ($loaded) {
        return $user;
    }

    $loaded = true;

    $id = (int) ($_SESSION['user_id'] ?? 0);
    if ($id <= 0) {
        return null;
    }

    global $db;

    $user = (new UserRepository($db))->findWithOrganization($id);

    if ($user === null) {
        // The account was deleted while the session was still alive.
        unset($_SESSION['user_id']);
    }

    return $user;
}

function auth_check(): bool
{
    return auth_user() !== null;
}

/**
 * Sign a user in: new session id (prevents session fixation) and a fresh
 * CSRF token for the authenticated session.
 */
function login_user(array $user): void
{
    session_regenerate_id(true);

    $_SESSION['user_id'] = (int) $user['id'];

    // The pre-login token belonged to an anonymous session — never reuse it.
    // A half-finished sign-up (or Google attempt) must not survive sign-in.
    unset(
        $_SESSION['csrf_token'],
        $_SESSION['login_attempts'],
        $_SESSION['signup'],
        $_SESSION['google_state']
    );
}

/**
 * Forget the current user and rotate the session id again.
 */
function logout_user(): void
{
    unset(
        $_SESSION['user_id'],
        $_SESSION['csrf_token'],
        $_SESSION['login_attempts'],
        $_SESSION['signup'],
        $_SESSION['google_state']
    );

    session_regenerate_id(true);
}

/**
 * Require a signed-in user; guests are sent to the sign-in page.
 */
function require_auth(): array
{
    $user = auth_user();

    if ($user === null) {
        flash('Please sign in to continue.');
        redirect('index.php?r=login');
    }

    return $user;
}

/**
 * Keep signed-in users away from the sign-in / sign-up screens.
 */
function require_guest(): void
{
    if (auth_check()) {
        redirect('index.php');
    }
}

/**
 * The organization the user belongs to, built from the joined user row
 * (no extra query). Null when the user is not part of one.
 *
 * @return array{id: int, name: string, owner_id: int}|null
 */
function user_organization(?array $user): ?array
{
    if ($user === null || empty($user['organization_id'])) {
        return null;
    }

    return [
        'id' => (int) $user['organization_id'],
        'name' => (string) ($user['organization_name'] ?? ''),
        'owner_id' => (int) ($user['organization_owner_id'] ?? 0),
    ];
}

/**
 * True for the organization account (the owner) — the only role allowed to
 * manage members and read the team's tasks.
 */
function is_org_owner(?array $user): bool
{
    $organization = user_organization($user);

    return $organization !== null && $organization['owner_id'] === (int) $user['id'];
}

/**
 * Seconds the visitor still has to wait before another sign-in attempt
 * (0 = not blocked).
 */
function login_blocked_for(): int
{
    $attempts = $_SESSION['login_attempts'] ?? [];
    if (!is_array($attempts)) {
        return 0;
    }

    $now = time();
    $recent = [];
    foreach ($attempts as $timestamp) {
        if (is_int($timestamp) && $timestamp > $now - AUTH_ATTEMPT_WINDOW) {
            $recent[] = $timestamp;
        }
    }

    $_SESSION['login_attempts'] = $recent;

    if (count($recent) < AUTH_MAX_ATTEMPTS) {
        return 0;
    }

    return max(1, ($recent[0] + AUTH_ATTEMPT_WINDOW) - $now);
}

/**
 * Record one failed sign-in (per session — enough to stop casual guessing).
 */
function record_login_failure(): void
{
    $attempts = $_SESSION['login_attempts'] ?? [];
    if (!is_array($attempts)) {
        $attempts = [];
    }

    $attempts[] = time();
    $_SESSION['login_attempts'] = $attempts;
}

function clear_login_failures(): void
{
    unset($_SESSION['login_attempts']);
}
