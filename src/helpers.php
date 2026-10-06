<?php

/**
 * src/helpers.php
 *
 * Small shared functions: output escaping, CSRF protection, redirects,
 * template rendering and time formatting.
 */

declare(strict_types=1);

/**
 * Escape a value for safe output inside HTML (prevents stored XSS — todo
 * titles come from user input and are printed back into the page).
 */
function e(mixed $value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
}

/**
 * CSRF token for this session (generated once, stored server-side).
 */
function csrf_token(): string
{
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }

    return $_SESSION['csrf_token'];
}

/**
 * String length in characters — uses mb_strlen() when the mbstring extension
 * is available, otherwise falls back to a byte count (stricter, never laxer).
 */
function str_len(string $value): int
{
    return function_exists('mb_strlen') ? mb_strlen($value) : strlen($value);
}

/**
 * Hidden input to embed the CSRF token in every POST form.
 */
function csrf_field(): string
{
    return '<input type="hidden" name="csrf_token" value="' . e(csrf_token()) . '">';
}

/**
 * Validate the token on every state-changing request. hash_equals() compares
 * in constant time so the token cannot be guessed through timing attacks.
 */
function verify_csrf(): void
{
    $sent = $_POST['csrf_token'] ?? '';

    if (!is_string($sent) || $sent === '' || !hash_equals(csrf_token(), $sent)) {
        http_response_code(419);
        exit('Session expired. Go back and try again.');
    }
}

/**
 * The list of query parameters worth preserving across actions (filter +
 * search). Embedded in forms as a hidden "return_to" field.
 */
function return_to_value(): string
{
    $keep = array_intersect_key($_GET, array_flip(['page', 'q']));
    $query = http_build_query($keep);

    return $query === '' ? '' : '?' . $query;
}

/**
 * Redirect back to the list after a POST (Post/Redirect/Get — prevents
 * duplicate submissions on refresh and avoids blank pages).
 *
 * The target is restricted to a relative "?page=..&q=.." query string so a
 * tampered value can never turn into an open redirect to another host.
 */
function redirect_back(?string $returnTo = null): never
{
    $target = $returnTo ?? ($_POST['return_to'] ?? '');

    if (!is_string($target) || !preg_match('/^\?(?:[a-z_]+=[A-Za-z0-9%+_.\-]*&?)*$/', $target)) {
        $target = '';
    }

    header('Location: index.php' . $target);
    exit;
}

/**
 * Render a template with extracted variables (keeps controllers thin).
 */
function render(string $template, array $vars = []): void
{
    extract($vars, EXTR_SKIP);
    require ROOT_PATH . '/templates/' . $template . '.php';
}

/**
 * Greeting that follows the time of day: "Good morning Abel!".
 */
function greeting_for(string $name): string
{
    $hour = (int) date('G');
    $part = match (true) {
        $hour < 12 => 'morning',
        $hour < 17 => 'afternoon',
        default    => 'evening',
    };

    return "Good {$part} {$name}!";
}

/**
 * "Today, Wednesday 26 October, 2026" — matches the design's date line.
 */
function today_line(): string
{
    return 'Today, ' . date('l j F, Y');
}

/**
 * Store a time as HH:MM (what <input type="time"> submits) only if it is
 * well-formed; anything else becomes null so it is simply not rendered.
 */
function sanitize_time(?string $value): ?string
{
    if ($value === null || $value === '') {
        return null;
    }

    return preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $value) ? $value : null;
}

/**
 * "10:30" + "14:00" => "10:30AM - 2:00PM" (the design's time range format).
 * Returns null when either end is missing so the row renders without a time.
 */
function format_time_range(?string $start, ?string $end): ?string
{
    if ($start === null || $end === null) {
        return null;
    }

    return format_time($start) . ' - ' . format_time($end);
}

/**
 * 24h "14:00" => "2:00PM".
 */
function format_time(string $value): string
{
    [$hour, $minute] = explode(':', $value);
    $hour = (int) $hour;

    $suffix = $hour >= 12 ? 'PM' : 'AM';
    $hour12 = $hour % 12;
    if ($hour12 === 0) {
        $hour12 = 12;
    }

    return $hour12 . ':' . $minute . $suffix;
}
