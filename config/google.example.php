<?php

/**
 * Google sign-in settings — copy this file to config/google.php and fill in
 * the values from https://console.cloud.google.com/apis/credentials
 *
 *   1. Create (or pick) a project, then "Create credentials" → "OAuth client ID"
 *      → application type "Web application".
 *   2. Under "Authorised redirect URIs" add the address this app will use, e.g.
 *        http://127.0.0.1:8000/index.php?r=auth.google.callback
 *      The app derives that URI from the current host when 'redirect_uri' is
 *      left empty — whatever you register in Google must match exactly
 *      (scheme, host, port, path and query string).
 *   3. Paste the client ID and client secret below.
 *
 * config/google.php is git-ignored because the client secret must not be
 * committed. Without it the app still runs; the Google button simply reports
 * that Google sign-in is not configured yet.
 */

return [
    'client_id' => '',
    'client_secret' => '',

    // Leave empty to use the current host + /index.php?r=auth.google.callback.
    'redirect_uri' => '',

    // Google's real endpoints. Only change these to point at a test stand-in.
    'authorize_url' => 'https://accounts.google.com/o/oauth2/v2/auth',
    'token_url' => 'https://oauth2.googleapis.com/token',
    'userinfo_url' => 'https://openidconnect.googleapis.com/v1/userinfo',
];
