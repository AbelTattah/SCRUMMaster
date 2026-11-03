<?php

/**
 * Email delivery for notifications — copy this file to config/mail.php and
 * adjust the values you need.
 *
 * config/mail.php is git-ignored because it holds credentials.
 *
 * transport:
 *   'log'  — write messages to storage/mail.log (default, no setup)
 *   'mail' — use PHP's mail() function (needs a local sendmail/relay)
 *   'smtp' — connect to the SMTP server below
 *
 * Every value can also be supplied through an environment variable, which
 * wins over this file: MAIL_TRANSPORT, MAIL_FROM, MAIL_FROM_NAME, SMTP_HOST,
 * SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE.
 */

return [
    'transport' => 'log',

    'from_email' => 'no-reply@kpime.local',
    'from_name' => 'KPIMe',

    // Only used when transport is 'smtp'.
    'smtp_host' => '',
    'smtp_port' => 587,
    'smtp_user' => '',
    'smtp_pass' => '',

    // 'tls' (STARTTLS, usually port 587), 'ssl' (implicit TLS, usually 465)
    // or 'none' (plain, local relays only).
    'smtp_secure' => 'tls',
];
