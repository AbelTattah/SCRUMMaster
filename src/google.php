<?php

/**
 * src/google.php
 *
 * "Continue with Google" — OAuth 2.0 authorisation-code flow with OpenID
 * Connect, using PKCE (S256) and a random state value to protect the callback.
 *
 * Only the Google account id ("sub"), the verified email, the display name and
 * the picture URL are used. Nothing is trusted from the browser: the code is
 * exchanged server-to-server and the profile comes from Google's userinfo
 * endpoint over TLS.
 *
 * Endpoints and credentials are configurable (config/google.php or the
 * GOOGLE_* environment variables) so the flow can be exercised against a local
 * stand-in during tests; the defaults are Google's real endpoints.
 */

declare(strict_types=1);

/**
 * Effective Google settings: environment first, then config/google.php, then
 * the built-in defaults.
 *
 * @return array{client_id: string, client_secret: string, redirect_uri: string,
 *               authorize_url: string, token_url: string, userinfo_url: string}
 */
function google_config(): array
{
    static $config = null;

    if ($config !== null) {
        return $config;
    }

    $defaults = [
        'client_id' => '',
        'client_secret' => '',
        'redirect_uri' => '',
        'authorize_url' => 'https://accounts.google.com/o/oauth2/v2/auth',
        'token_url' => 'https://oauth2.googleapis.com/token',
        'userinfo_url' => 'https://openidconnect.googleapis.com/v1/userinfo',
    ];

    $file = ROOT_PATH . '/config/google.php';
    $stored = is_file($file) ? require $file : [];
    $stored = is_array($stored) ? $stored : [];

    $config = [];

    foreach ($defaults as $key => $default) {
        $env = getenv('GOOGLE_' . strtoupper($key));

        if (is_string($env) && $env !== '') {
            $config[$key] = $env;
        } elseif (isset($stored[$key]) && (string) $stored[$key] !== '') {
            $config[$key] = (string) $stored[$key];
        } else {
            $config[$key] = $default;
        }
    }

    return $config;
}

/**
 * True when a client id + secret are available.
 */
function google_configured(): bool
{
    $config = google_config();

    return $config['client_id'] !== '' && $config['client_secret'] !== '';
}

/**
 * The URL Google sends the visitor back to. When no explicit value is
 * configured it is derived from the current request, so the app works on any
 * local port — the same URI must be registered on the Google OAuth client.
 */
function google_redirect_uri(): string
{
    $configured = trim(google_config()['redirect_uri']);

    if ($configured !== '') {
        return $configured;
    }

    $https = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
    $host = (string) ($_SERVER['HTTP_HOST'] ?? '127.0.0.1:8000');
    $path = strtok((string) ($_SERVER['REQUEST_URI'] ?? '/index.php'), '?');

    if ($path === false || $path === '') {
        $path = '/index.php';
    }

    return ($https ? 'https' : 'http') . '://' . $host . $path . '?r=auth.google.callback';
}

/**
 * URL-safe base64 (used for the PKCE verifier and its S256 challenge).
 */
function base64url(string $value): string
{
    return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
}

/**
 * The Google consent-screen URL for a fresh sign-in attempt.
 */
function google_auth_url(string $state, string $verifier): string
{
    $config = google_config();

    $query = http_build_query([
        'client_id' => $config['client_id'],
        'redirect_uri' => google_redirect_uri(),
        'response_type' => 'code',
        'scope' => 'openid email profile',
        'state' => $state,
        'code_challenge' => base64url(hash('sha256', $verifier, true)),
        'code_challenge_method' => 'S256',
        'access_type' => 'online',
        'prompt' => 'select_account',
    ]);

    return $config['authorize_url'] . '?' . $query;
}

/**
 * Exchange the one-time code for an access token (server-to-server).
 *
 * @return array{access_token: string}|null
 */
function google_exchange_code(string $code, string $verifier): ?array
{
    $config = google_config();

    $body = http_build_query([
        'code' => $code,
        'client_id' => $config['client_id'],
        'client_secret' => $config['client_secret'],
        'redirect_uri' => google_redirect_uri(),
        'grant_type' => 'authorization_code',
        'code_verifier' => $verifier,
    ]);

    $response = http_request($config['token_url'], [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $body,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/x-www-form-urlencoded',
            'Accept: application/json',
        ],
    ]);

    $data = $response !== null ? json_decode($response, true) : null;

    return is_array($data) && !empty($data['access_token']) ? $data : null;
}

/**
 * The person's Google profile (sub, email, email_verified, name, picture).
 */
function google_userinfo(string $accessToken): ?array
{
    $config = google_config();

    $response = http_request($config['userinfo_url'], [
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . $accessToken,
            'Accept: application/json',
        ],
    ]);

    $data = $response !== null ? json_decode($response, true) : null;

    return is_array($data) ? $data : null;
}

/**
 * Download a profile picture returned by Google and keep a local copy, so the
 * app stays usable offline and no external image is hot-linked. Anything
 * unexpected (wrong type, too big, network error) is ignored: the account is
 * still created, just with the default avatar.
 *
 * @return string|null relative path for users.avatar
 */
function store_remote_avatar(string $url): ?string
{
    if (!preg_match('#^https?://#i', $url)) {
        return null;
    }

    $maxBytes = 3 * 1024 * 1024;

    $body = http_request($url, [
        CURLOPT_TIMEOUT => 8,
        CURLOPT_MAXFILESIZE => $maxBytes,
    ]);

    if ($body === null || $body === '' || strlen($body) > $maxBytes) {
        return null;
    }

    // Verify the bytes really are an image (never trust the URL or headers).
    $info = @getimagesizefromstring($body);
    if ($info === false) {
        return null;
    }

    $types = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
        'image/gif' => 'gif',
    ];

    $mime = $info['mime'] ?? '';
    if (!isset($types[$mime])) {
        return null;
    }

    $directory = UPLOAD_PATH . '/avatars';
    if (!is_dir($directory) && !mkdir($directory, 0775, true) && !is_dir($directory)) {
        return null;
    }

    $filename = bin2hex(random_bytes(16)) . '.' . $types[$mime];

    if (file_put_contents($directory . '/' . $filename, $body) === false) {
        return null;
    }

    return 'uploads/avatars/' . $filename;
}

/**
 * Small cURL wrapper: returns the body of a 2xx response, or null.
 *
 * @param array<int, mixed> $options extra CURLOPT_* values
 */
function http_request(string $url, array $options = []): ?string
{
    if (!function_exists('curl_init')) {
        return null;
    }

    $ch = curl_init($url);

    if ($ch === false) {
        return null;
    }

    curl_setopt_array($ch, $options + [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_CONNECTTIMEOUT => 8,
        CURLOPT_TIMEOUT => 15,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
        CURLOPT_USERAGENT => 'KPIMe/1.0',
    ]);

    $body = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);

    // No curl_close(): since PHP 8.0 the handle is an object freed when it goes
    // out of scope, and the function is deprecated as of PHP 8.5.

    if (!is_string($body) || $status < 200 || $status >= 300) {
        return null;
    }

    return $body;
}
