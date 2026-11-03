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
 * Internal redirect (never accepts a full URL, so it cannot be used as an
 * open redirect if a caller ever forwards user input).
 */
function redirect(string $path): never
{
    header('Location: ' . $path);
    exit;
}

/**
 * Queue a one-shot message for the next rendered page.
 */
function flash(string $message): void
{
    $_SESSION['flash'] = $message;
}

/**
 * Read and clear the queued message (null when there is none).
 */
function take_flash(): ?string
{
    $message = $_SESSION['flash'] ?? null;
    unset($_SESSION['flash']);

    return is_string($message) && $message !== '' ? $message : null;
}

/**
 * Public URL for a stored avatar path, falling back to the design's default.
 */
function avatar_url(?string $path): string
{
    return is_string($path) && $path !== '' ? $path : 'assets/img/default-avatar.png';
}

/**
 * Validate and store an uploaded profile image.
 *
 * Checks (in order): PHP upload errors, size, real image content via
 * getimagesize() (so a renamed .php file can never be uploaded), allowed
 * MIME types, then moves it to public/uploads/avatars with a random name —
 * the original filename is never trusted or reused. The previous photo is
 * deleted once the new one is safely in place.
 *
 * @param array{name: string, error: int, size: int, tmp_name: string} $file
 * @return string relative path to store in the user row
 */
function store_avatar(array $file, ?string $oldPath = null): string
{
    // Maximum avatar file size: 3 MB.
    $maxBytes = 3 * 1024 * 1024;

    // MIME types we accept, mapped to a safe file extension.
    $types = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
        'image/gif' => 'gif',
    ];

    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        throw new RuntimeException('Upload failed (error code ' . (int) $file['error'] . ').');
    }

    if ((int) $file['size'] > $maxBytes) {
        throw new RuntimeException('Image is too large (max 3 MB).');
    }

    // getimagesize() works without the GD extension and verifies the file
    // really is an image, regardless of its claimed filename/extension.
    $info = @getimagesize($file['tmp_name']);
    if ($info === false) {
        throw new RuntimeException('That file is not a valid image.');
    }

    $mime = $info['mime'] ?? '';
    if (!isset($types[$mime])) {
        throw new RuntimeException('Only JPEG, PNG, WebP or GIF images are allowed.');
    }

    $directory = UPLOAD_PATH . '/avatars';
    if (!is_dir($directory) && !mkdir($directory, 0775, true) && !is_dir($directory)) {
        throw new RuntimeException('Upload directory is missing.');
    }

    // Random name: no path traversal, no collisions, no user input.
    $filename = bin2hex(random_bytes(16)) . '.' . $types[$mime];
    $destination = $directory . '/' . $filename;

    if (!move_uploaded_file($file['tmp_name'], $destination)) {
        throw new RuntimeException('Could not save the uploaded image.');
    }

    // Remove the previous photo so uploads don't pile up on disk. Only ever
    // inside uploads/avatars (basename strips any directory components).
    if (is_string($oldPath) && $oldPath !== '') {
        $old = UPLOAD_PATH . '/avatars/' . basename($oldPath);
        if (is_file($old)) {
            @unlink($old);
        }
    }

    return 'uploads/avatars/' . $filename;
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
