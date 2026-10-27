<?php

/**
 * src/bootstrap.php
 *
 * Application bootstrap: path constants, session, error handling and shared
 * dependencies. Every entry point (public/index.php) requires this once.
 */

declare(strict_types=1);

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------
// ROOT_PATH = project root (parent of src/). PUBLIC_PATH = web root.
// The SQLite file lives in storage/ (OUTSIDE the web root) so it can never be
// downloaded by a browser.
define('ROOT_PATH', dirname(__DIR__));
define('PUBLIC_PATH', ROOT_PATH . '/public');
define('UPLOAD_PATH', PUBLIC_PATH . '/uploads');

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------
// Show everything while developing. In production you would log instead and
// set display_errors = 0 — otherwise a fatal error would render a blank page
// (the original bug in this project).
ini_set('display_errors', '1');
error_reporting(E_ALL);

// ---------------------------------------------------------------------------
// Session (stored in the browser as the PHPSESSID cookie)
// ---------------------------------------------------------------------------
// The session carries the signed-in user id (see src/auth.php), the CSRF
// token and one-shot flash messages. Everything else — name, avatar, todos —
// lives in the database, so it survives session expiry.
if (session_status() === PHP_SESSION_NONE) {
    session_start([
        'cookie_httponly' => true, // JS cannot read the session cookie
        'cookie_samesite' => 'Lax', // basic CSRF hardening for the cookie
        'cookie_secure' => !empty($_SERVER['HTTPS']), // only over HTTPS when available
    ]);
}

// ---------------------------------------------------------------------------
// Dependencies
// ---------------------------------------------------------------------------
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/repositories/TodoRepository.php';
require_once __DIR__ . '/repositories/ProfileRepository.php';
require_once __DIR__ . '/repositories/UserRepository.php';
require_once __DIR__ . '/repositories/OrganizationRepository.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/google.php';
require_once __DIR__ . '/controllers/AuthController.php';
require_once __DIR__ . '/controllers/HomeController.php';
require_once __DIR__ . '/controllers/TodoController.php';
require_once __DIR__ . '/controllers/ProfileController.php';
require_once __DIR__ . '/controllers/TeamController.php';
