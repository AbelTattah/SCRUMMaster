<?php

/**
 * src/mailer.php
 *
 * Minimal email delivery for notifications.
 *
 * Three transports, selected in config/mail.php (or the MAIL_* environment
 * variables):
 *
 *   log   — append the message to storage/mail.log (default; no setup needed)
 *   mail  — hand the message to PHP's mail() (needs a local sendmail/relay)
 *   smtp  — talk to an SMTP server directly (STARTTLS, implicit TLS or plain)
 *
 * send_mail() returns null on success or a human-readable error string. It
 * never throws, so a broken mail setup cannot take a page down.
 */

declare(strict_types=1);

/**
 * Effective mail settings: environment first, then config/mail.php, then the
 * safe defaults. config/mail.php is git-ignored because it holds credentials.
 *
 * @return array{transport: string, from_email: string, from_name: string,
 *               smtp_host: string, smtp_port: int, smtp_user: string,
 *               smtp_pass: string, smtp_secure: string}
 */
function mail_config(): array
{
    static $config = null;

    if ($config !== null) {
        return $config;
    }

    $file = [];
    $path = ROOT_PATH . '/config/mail.php';

    if (is_file($path)) {
        $loaded = require $path;
        if (is_array($loaded)) {
            $file = $loaded;
        }
    }

    $env = static function (string $name): ?string {
        $value = getenv($name);

        return $value === false || $value === '' ? null : $value;
    };

    $transport = strtolower((string) ($env('MAIL_TRANSPORT') ?? $file['transport'] ?? 'log'));
    if (!in_array($transport, ['log', 'mail', 'smtp'], true)) {
        $transport = 'log';
    }

    $secure = strtolower((string) ($env('SMTP_SECURE') ?? $file['smtp_secure'] ?? 'tls'));
    if (!in_array($secure, ['tls', 'ssl', 'none'], true)) {
        $secure = 'tls';
    }

    $config = [
        'transport' => $transport,
        'from_email' => (string) ($env('MAIL_FROM') ?? $file['from_email'] ?? 'no-reply@kpime.local'),
        'from_name' => (string) ($env('MAIL_FROM_NAME') ?? $file['from_name'] ?? 'KPIMe'),
        'smtp_host' => (string) ($env('SMTP_HOST') ?? $file['smtp_host'] ?? ''),
        'smtp_port' => (int) ($env('SMTP_PORT') ?? $file['smtp_port'] ?? 587),
        'smtp_user' => (string) ($env('SMTP_USER') ?? $file['smtp_user'] ?? ''),
        'smtp_pass' => (string) ($env('SMTP_PASS') ?? $file['smtp_pass'] ?? ''),
        'smtp_secure' => $secure,
    ];

    return $config;
}

/**
 * Send one message.
 *
 * @param string      $to      recipient address
 * @param string      $subject plain-text subject
 * @param string      $body    plain-text body
 * @param string|null $html    optional HTML alternative
 * @return string|null error message, or null when the message was accepted
 */
function send_mail(string $to, string $subject, string $body, ?string $html = null): ?string
{
    $to = trim(str_replace(["\r", "\n"], '', $to));
    $subject = trim(str_replace(["\r", "\n"], ' ', $subject));

    if (!filter_var($to, FILTER_VALIDATE_EMAIL)) {
        return 'That email address is not valid.';
    }

    $config = mail_config();

    try {
        return match ($config['transport']) {
            'mail' => mail_send($config, $to, $subject, $body, $html),
            'smtp' => mail_send_smtp($config, $to, $subject, $body, $html),
            default => mail_send_log($config, $to, $subject, $body),
        };
    } catch (Throwable $e) {
        return $e->getMessage();
    }
}

/**
 * A short label for the configured transport ("log", "mail" or "smtp").
 */
function mail_transport_label(): string
{
    return mail_config()['transport'];
}

/**
 * True when the selected transport has enough settings to work.
 */
function mail_is_configured(): bool
{
    $config = mail_config();

    return match ($config['transport']) {
        'smtp' => $config['smtp_host'] !== '',
        'mail' => function_exists('mail'),
        default => is_writable(ROOT_PATH . '/storage') || is_writable(ROOT_PATH . '/storage/mail.log'),
    };
}

/**
 * log transport: readable, append-only file under storage/.
 */
function mail_send_log(array $config, string $to, string $subject, string $body): ?string
{
    $file = ROOT_PATH . '/storage/mail.log';

    $entry = '===== ' . gmdate('Y-m-d H:i:s') . " UTC =====\n"
        . 'From: ' . $config['from_name'] . ' <' . $config['from_email'] . ">\n"
        . 'To: ' . $to . "\n"
        . 'Subject: ' . $subject . "\n\n"
        . $body . "\n\n";

    if (@file_put_contents($file, $entry, FILE_APPEND | LOCK_EX) === false) {
        return 'Could not write to storage/mail.log.';
    }

    return null;
}

/**
 * mail transport: PHP's mail() function.
 */
function mail_send(array $config, string $to, string $subject, string $body, ?string $html): ?string
{
    [$headers, $payload] = mail_build_message($config, $to, $subject, $body, $html);

    $ok = @mail($to, mail_header_value($subject), $payload, implode("\r\n", $headers));

    return $ok ? null : 'PHP mail() refused the message. Check the server mail configuration.';
}

/**
 * smtp transport: a tiny SMTP client with STARTTLS / implicit TLS support.
 */
function mail_send_smtp(array $config, string $to, string $subject, string $body, ?string $html): ?string
{
    if ($config['smtp_host'] === '') {
        return 'SMTP is selected but no smtp_host is set (see config/mail.php).';
    }

    [$headers, $payload] = mail_build_message($config, $to, $subject, $body, $html);

    $remote = ($config['smtp_secure'] === 'ssl' ? 'ssl://' : 'tcp://')
        . $config['smtp_host'] . ':' . $config['smtp_port'];

    $errno = 0;
    $errstr = '';
    $socket = @stream_socket_client($remote, $errno, $errstr, 15, STREAM_CLIENT_CONNECT);

    if ($socket === false) {
        return 'Could not connect to ' . $config['smtp_host'] . ': ' . ($errstr !== '' ? $errstr : 'error ' . $errno);
    }

    stream_set_timeout($socket, 15);

    try {
        smtp_expect($socket, [220]);

        $host = gethostname() ?: 'localhost';
        $ehlo = smtp_command($socket, 'EHLO ' . $host, [250]);

        if ($config['smtp_secure'] === 'tls') {
            smtp_command($socket, 'STARTTLS', [220]);

            if (!@stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
                throw new RuntimeException('Could not start TLS with the mail server.');
            }

            $ehlo = smtp_command($socket, 'EHLO ' . $host, [250]);
        }

        if ($config['smtp_user'] !== '') {
            $supportsAuth = false;
            foreach ($ehlo as $line) {
                if (stripos($line, 'AUTH') !== false) {
                    $supportsAuth = true;
                    break;
                }
            }

            if (!$supportsAuth) {
                throw new RuntimeException('The mail server does not offer authentication.');
            }

            smtp_command($socket, 'AUTH LOGIN', [334]);
            smtp_command($socket, base64_encode($config['smtp_user']), [334]);
            smtp_command($socket, base64_encode($config['smtp_pass']), [235]);
        }

        smtp_command($socket, 'MAIL FROM:<' . $config['from_email'] . '>', [250]);
        smtp_command($socket, 'RCPT TO:<' . $to . '>', [250, 251]);
        smtp_command($socket, 'DATA', [354]);

        $data = implode("\r\n", $headers) . "\r\n\r\n" . $payload;
        $data = preg_replace('/^\./m', '..', $data) ?? $data;

        if (@fwrite($socket, $data . "\r\n.\r\n") === false) {
            throw new RuntimeException('Could not send the message body.');
        }

        smtp_expect($socket, [250]);
        smtp_command($socket, 'QUIT', [221]);

        return null;
    } finally {
        @fclose($socket);
    }
}

/**
 * Build the RFC 5322 headers and body for a message.
 *
 * @return array{0: array<int, string>, 1: string}
 */
function mail_build_message(array $config, string $to, string $subject, string $body, ?string $html): array
{
    $headers = [
        'From: ' . mail_header_value($config['from_name']) . ' <' . $config['from_email'] . '>',
        'To: <' . $to . '>',
        'Subject: ' . mail_header_value($subject),
        'Date: ' . date('r'),
        'Message-ID: <' . bin2hex(random_bytes(12)) . '@' . mail_domain() . '>',
        'MIME-Version: 1.0',
    ];

    if ($html !== null && $html !== '') {
        $boundary = 'kpime-' . bin2hex(random_bytes(12));

        $headers[] = 'Content-Type: multipart/alternative; boundary="' . $boundary . '"';

        $payload = '--' . $boundary . "\r\n"
            . "Content-Type: text/plain; charset=UTF-8\r\n"
            . "Content-Transfer-Encoding: base64\r\n\r\n"
            . chunk_split(base64_encode($body)) . "\r\n"
            . '--' . $boundary . "\r\n"
            . "Content-Type: text/html; charset=UTF-8\r\n"
            . "Content-Transfer-Encoding: base64\r\n\r\n"
            . chunk_split(base64_encode($html)) . "\r\n"
            . '--' . $boundary . '--';

        return [$headers, $payload];
    }

    $headers[] = 'Content-Type: text/plain; charset=UTF-8';
    $headers[] = 'Content-Transfer-Encoding: base64';

    return [$headers, chunk_split(base64_encode($body))];
}

/**
 * Encode a header value when mbstring is available; strip newlines always
 * (header injection).
 */
function mail_header_value(string $value): string
{
    $value = trim(str_replace(["\r", "\n"], ' ', $value));

    if (function_exists('mb_encode_mimeheader') && preg_match('/[^\x20-\x7E]/', $value)) {
        return mb_encode_mimeheader($value, 'UTF-8');
    }

    return $value;
}

/**
 * Domain used in the Message-ID header.
 */
function mail_domain(): string
{
    $host = $_SERVER['SERVER_NAME'] ?? 'kpime.local';
    $host = preg_replace('/[^A-Za-z0-9.\-]/', '', (string) $host) ?: 'kpime.local';

    return $host;
}

/**
 * Read one (possibly multi-line) SMTP response.
 *
 * @param resource $socket
 * @return array<int, string>
 */
function smtp_read_response($socket): array
{
    $lines = [];

    while (($line = fgets($socket, 1024)) !== false) {
        $line = rtrim($line, "\r\n");
        $lines[] = $line;

        // "250-..." continues, "250 ..." ends the response.
        if (strlen($line) < 4 || $line[3] === ' ') {
            break;
        }
    }

    if ($lines === []) {
        throw new RuntimeException('The mail server closed the connection.');
    }

    return $lines;
}

/**
 * @param resource $socket
 * @param array<int, int> $expected
 * @return array<int, string>
 */
function smtp_expect($socket, array $expected): array
{
    $lines = smtp_read_response($socket);
    $code = (int) substr($lines[0], 0, 3);

    if (!in_array($code, $expected, true)) {
        throw new RuntimeException('Mail server error: ' . implode(' ', $lines));
    }

    return $lines;
}

/**
 * @param resource $socket
 * @param array<int, int> $expected
 * @return array<int, string>
 */
function smtp_command($socket, string $command, array $expected): array
{
    if (@fwrite($socket, $command . "\r\n") === false) {
        throw new RuntimeException('Could not write to the mail server.');
    }

    return smtp_expect($socket, $expected);
}
