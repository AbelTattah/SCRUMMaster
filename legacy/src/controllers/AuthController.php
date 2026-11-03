<?php

/**
 * AuthController
 *
 * Authentication: email + password sign in, two-step sign up and Google
 * sign-in (OAuth 2.0 / OpenID Connect).
 *
 * Sign up is deliberately split in two screens:
 *
 *   Step 1 (?r=register)             name, email, password, photo
 *   Step 2 (?r=register&step=2)      personal or organization account
 *
 * Step 1 is kept in the session (as a hashed password, never the plain text)
 * so the visitor can go back and edit it. Google sign-up reuses step 2: after
 * Google returns a verified identity, a brand-new person lands on the
 * account-type form with their name, email and photo already filled in.
 */

declare(strict_types=1);

final class AuthController
{
    /** Minimum password length (characters). */
    private const MIN_PASSWORD = 8;

    /** bcrypt silently ignores anything past 72 bytes — reject instead. */
    private const MAX_PASSWORD_BYTES = 72;

    /** How long a half-finished sign-up stays valid (seconds). */
    private const DRAFT_TTL = 3600;

    /** How long the Google state/verifier pair stays valid (seconds). */
    private const GOOGLE_TTL = 600;

    // -----------------------------------------------------------------------
    // Sign in / sign out
    // -----------------------------------------------------------------------

    public static function showLogin(): void
    {
        require_guest();

        render('auth/login', [
            'title' => 'Sign in — Scrum Master',
            'email' => '',
            'error' => null,
            'flash' => take_flash(),
        ]);
    }

    public static function login(): never
    {
        verify_csrf();

        $email = strtolower(trim((string) ($_POST['email'] ?? '')));
        $password = (string) ($_POST['password'] ?? '');

        $wait = login_blocked_for();
        if ($wait > 0) {
            self::failLogin(
                'Too many attempts. Try again in ' . max(1, (int) ceil($wait / 60)) . ' minute(s).',
                $email,
                429
            );
        }

        $user = self::users()->findByEmail($email);

        // Same message whether the email or the password was wrong, so the
        // form cannot be used to discover which accounts exist. Accounts
        // created with Google have no password at all.
        $hash = $user !== null ? (string) $user['password_hash'] : '';

        if ($user === null || $hash === '' || !password_verify($password, $hash)) {
            record_login_failure();
            self::failLogin('Email or password is incorrect.', $email, 422);
        }

        // Transparently upgrade old hashes when PHP's default cost changes.
        if (password_needs_rehash($hash, PASSWORD_DEFAULT)) {
            self::users()->updatePassword(
                (int) $user['id'],
                password_hash($password, PASSWORD_DEFAULT)
            );
        }

        clear_login_failures();
        login_user($user);
        flash('Welcome back, ' . $user['name'] . '!');

        redirect('index.php');
    }

    public static function logout(): never
    {
        verify_csrf();
        logout_user();
        flash('You have been signed out.');

        redirect('index.php?r=login');
    }

    // -----------------------------------------------------------------------
    // Sign up — step 1: details
    // -----------------------------------------------------------------------

    public static function showRegister(): void
    {
        require_guest();

        $draft = self::draft();

        // A pending Google sign-up has no editable details — continue at step 2.
        if ($draft !== null && ($draft['source'] ?? '') === 'google') {
            redirect('index.php?r=register&step=2');
        }

        // Only the very first account can inherit pre-auth data.
        $legacy = self::users()->count() === 0 ? self::legacyProfile() : null;

        render('auth/register', [
            'title' => 'Create your account — Scrum Master',
            'old' => [
                'name' => (string) ($draft['name'] ?? ($legacy['name'] ?? '')),
                'email' => (string) ($draft['email'] ?? ''),
            ],
            'avatar' => $draft['avatar'] ?? null,
            'error' => null,
            'flash' => take_flash(),
            'hasLegacyData' => $legacy !== null,
        ]);
    }

    /**
     * POST from step 1: validate the details and remember them for step 2.
     */
    public static function registerDetails(): never
    {
        verify_csrf();
        require_guest();

        $name = trim((string) ($_POST['name'] ?? ''));
        $email = strtolower(trim((string) ($_POST['email'] ?? '')));
        $password = (string) ($_POST['password'] ?? '');
        $confirm = (string) ($_POST['password_confirm'] ?? '');

        $draft = self::draft();
        $avatar = $draft !== null && ($draft['source'] ?? '') === 'password'
            ? ($draft['avatar'] ?? null)
            : null;

        $error = self::validateDetails($name, $email, $password, $confirm);
        if ($error !== null) {
            self::failDetails($error, $name, $email, $avatar, 422);
        }

        if (self::users()->findByEmail($email) !== null) {
            self::failDetails(
                'That email is already registered. Try signing in instead.',
                $name,
                $email,
                $avatar,
                422
            );
        }

        if (isset($_FILES['avatar']) && $_FILES['avatar']['error'] !== UPLOAD_ERR_NO_FILE) {
            try {
                $uploaded = store_avatar($_FILES['avatar']);
            } catch (RuntimeException $e) {
                self::failDetails($e->getMessage(), $name, $email, $avatar, 422);
            }

            // Replace the photo chosen on a previous visit to step 1.
            self::discardAvatar($avatar);
            $avatar = $uploaded;
        }

        self::saveDraft([
            'source' => 'password',
            'name' => $name,
            'email' => $email,
            'password_hash' => password_hash($password, PASSWORD_DEFAULT),
            'google_id' => null,
            'avatar' => $avatar,
            'picture' => '',
            'created' => time(),
        ]);

        redirect('index.php?r=register&step=2');
    }

    // -----------------------------------------------------------------------
    // Sign up — step 2: personal or organization
    // -----------------------------------------------------------------------

    public static function showAccountType(): void
    {
        require_guest();

        $draft = self::draft();
        if ($draft === null) {
            flash('Start by entering your details.');
            redirect('index.php?r=register');
        }

        self::renderAccountType($draft, 'personal', '', null, take_flash());
    }

    /**
     * POST from step 2: create the account (and the organization, when the
     * visitor picked that). Works for both email/password and Google sign-ups.
     */
    public static function registerAccount(): never
    {
        verify_csrf();
        require_guest();

        $draft = self::draft();
        if ($draft === null) {
            flash('Start by entering your details.');
            redirect('index.php?r=register');
        }

        $type = ($_POST['account_type'] ?? 'personal') === 'organization' ? 'organization' : 'personal';
        $organizationName = trim((string) ($_POST['org_name'] ?? ''));

        if ($type === 'organization' && (str_len($organizationName) < 2 || str_len($organizationName) > 80)) {
            self::renderAccountType(
                $draft,
                $type,
                $organizationName,
                'Please enter an organization name (2–80 characters).',
                null,
                422
            );
        }

        // The address could have been claimed between the two steps.
        if (self::users()->findByEmail((string) $draft['email']) !== null) {
            self::discardAvatar($draft['avatar'] ?? null);
            self::clearDraft();
            flash('That email was registered in the meantime. Please sign in.');
            redirect('index.php?r=login');
        }

        // Google accounts get their photo downloaded now (only if the account
        // is really being created), otherwise the uploaded one is reused.
        $avatar = $draft['avatar'] ?? null;
        if (($avatar === null || $avatar === '') && !empty($draft['picture'])) {
            $avatar = store_remote_avatar((string) $draft['picture']);
        }

        // The very first account inherits the pre-auth tasks (and photo).
        $isFirstAccount = self::users()->count() === 0;

        $users = self::users();
        $organizations = new OrganizationRepository(self::db());

        self::db()->beginTransaction();

        try {
            $userId = $users->create(
                (string) $draft['name'],
                (string) $draft['email'],
                (string) ($draft['password_hash'] ?? ''),
                $avatar,
                $draft['google_id'] ?? null
            );

            if ($type === 'organization') {
                $organizationId = $organizations->create($organizationName, $userId);
                $users->setOrganization($userId, $organizationId);
            }

            if ($isFirstAccount) {
                self::adoptLegacyData($userId, $avatar);
            }

            self::db()->commit();
        } catch (PDOException $e) {
            self::db()->rollBack();

            // Unique email / Google id index: someone got there first.
            if (str_contains($e->getMessage(), 'UNIQUE')) {
                self::discardAvatar($avatar);
                self::clearDraft();
                flash('That account already exists. Please sign in.');
                redirect('index.php?r=login');
            }

            throw $e;
        } catch (Throwable $e) {
            self::db()->rollBack();
            self::discardAvatar($avatar);

            throw $e;
        }

        self::clearDraft();

        $user = $users->findWithOrganization($userId);
        if ($user === null) {
            throw new RuntimeException('The account was created but could not be loaded.');
        }

        login_user($user);
        flash('Welcome to Scrum Master, ' . $draft['name'] . '!');

        redirect('index.php');
    }

    /**
     * "Cancel" on step 2: forget the draft and start over.
     */
    public static function cancelDraft(): never
    {
        require_guest();

        $draft = self::draft();
        if ($draft !== null) {
            self::discardAvatar($draft['avatar'] ?? null);
        }

        self::clearDraft();
        unset($_SESSION['google_state']);

        flash('Sign-up cancelled.');
        redirect('index.php?r=register');
    }

    // -----------------------------------------------------------------------
    // Google sign-in
    // -----------------------------------------------------------------------

    /**
     * Send the visitor to Google's consent screen.
     */
    public static function googleStart(): never
    {
        require_guest();

        if (!google_configured()) {
            flash('Google sign-in is not configured yet. Add your Google client ID and secret in config/google.php.');
            redirect('index.php?r=login');
        }

        $state = bin2hex(random_bytes(16));
        $verifier = base64url(random_bytes(32));

        // Kept server-side: the state proves the callback belongs to this
        // browser, the verifier proves the code was issued to this request.
        $_SESSION['google_state'] = [
            'state' => $state,
            'verifier' => $verifier,
            'created' => time(),
        ];

        redirect(google_auth_url($state, $verifier));
    }

    /**
     * Google sends the visitor back here with a one-time code.
     */
    public static function googleCallback(): never
    {
        require_guest();

        $pending = $_SESSION['google_state'] ?? null;
        unset($_SESSION['google_state']);

        $state = (string) ($_GET['state'] ?? '');
        $code = (string) ($_GET['code'] ?? '');
        $error = (string) ($_GET['error'] ?? '');

        $valid = is_array($pending)
            && isset($pending['state'], $pending['verifier'], $pending['created'])
            && $state !== ''
            && hash_equals((string) $pending['state'], $state)
            && time() - (int) $pending['created'] <= self::GOOGLE_TTL;

        if (!$valid) {
            flash('That Google sign-in link has expired. Please try again.');
            redirect('index.php?r=login');
        }

        if ($error !== '' || $code === '') {
            flash($error === 'access_denied'
                ? 'Google sign-in was cancelled.'
                : 'Google sign-in did not complete. Please try again.');
            redirect('index.php?r=login');
        }

        $token = google_exchange_code($code, (string) $pending['verifier']);
        if ($token === null) {
            flash('Could not reach Google. Please try again.');
            redirect('index.php?r=login');
        }

        $profile = google_userinfo((string) $token['access_token']);

        if ($profile === null || empty($profile['sub']) || empty($profile['email'])) {
            flash('Google did not return an email address for this account.');
            redirect('index.php?r=login');
        }

        // Linking an existing account by email is only safe when Google has
        // verified that address, so anything other than a clear "true" stops.
        $verified = $profile['email_verified'] ?? false;
        if (!in_array($verified, [true, 1, '1', 'true'], true)) {
            flash('Google has not verified that email address yet.');
            redirect('index.php?r=login');
        }

        $googleId = (string) $profile['sub'];
        $email = strtolower(trim((string) $profile['email']));
        $users = self::users();

        // 1. This Google account is already linked — straight in.
        $linked = $users->findByGoogleId($googleId);
        if ($linked !== null) {
            self::signIn((int) $linked['id']);
        }

        // 2. An account with the same (verified) email exists — link it.
        $existing = $users->findByEmail($email);
        if ($existing !== null) {
            $users->linkGoogle((int) $existing['id'], $googleId);
            self::signIn((int) $existing['id']);
        }

        // 3. New person: ask for the account type (step 2) with their Google
        //    identity already filled in.
        $name = trim((string) ($profile['name'] ?? ''));
        if ($name === '') {
            $name = (string) strstr($email, '@', true);
        }

        self::saveDraft([
            'source' => 'google',
            'name' => $name,
            'email' => $email,
            'password_hash' => '',
            'google_id' => $googleId,
            'avatar' => null,
            'picture' => (string) ($profile['picture'] ?? ''),
            'created' => time(),
        ]);

        redirect('index.php?r=register&step=2');
    }

    // -----------------------------------------------------------------------
    // Internals
    // -----------------------------------------------------------------------

    /**
     * Finish a Google sign-in for an existing account.
     */
    private static function signIn(int $userId): never
    {
        $user = self::users()->findWithOrganization($userId);

        if ($user === null) {
            flash('That account could not be loaded. Please try again.');
            redirect('index.php?r=login');
        }

        login_user($user);
        flash('Welcome back, ' . $user['name'] . '!');

        redirect('index.php');
    }

    /**
     * @return string|null error message, or null when the details are valid
     */
    private static function validateDetails(
        string $name,
        string $email,
        string $password,
        string $confirm
    ): ?string {
        if ($name === '' || str_len($name) > 60) {
            return 'Please enter your name (max 60 characters).';
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || str_len($email) > 190) {
            return 'Please enter a valid email address.';
        }

        if (str_len($password) < self::MIN_PASSWORD) {
            return 'Your password must be at least ' . self::MIN_PASSWORD . ' characters.';
        }

        if (strlen($password) > self::MAX_PASSWORD_BYTES) {
            return 'Your password is too long (max 72 characters).';
        }

        if ($password !== $confirm) {
            return 'The two passwords do not match.';
        }

        return null;
    }

    /**
     * The pending sign-up (step 1 details, or a Google identity), or null.
     * Expired drafts are dropped, including any photo they were holding.
     */
    private static function draft(): ?array
    {
        $draft = $_SESSION['signup'] ?? null;

        if (!is_array($draft) || !isset($draft['source'], $draft['name'], $draft['email'])) {
            return null;
        }

        if (time() - (int) ($draft['created'] ?? 0) > self::DRAFT_TTL) {
            self::discardAvatar($draft['avatar'] ?? null);
            self::clearDraft();

            return null;
        }

        return $draft;
    }

    private static function saveDraft(array $draft): void
    {
        $_SESSION['signup'] = $draft;
    }

    private static function clearDraft(): void
    {
        unset($_SESSION['signup']);
    }

    /**
     * Render the account-type screen (shared by both sign-up sources) and stop
     * — the caller must never continue into account creation after a re-render.
     */
    private static function renderAccountType(
        array $draft,
        string $type,
        string $organizationName,
        ?string $error,
        ?string $flash,
        int $status = 200
    ): never {
        http_response_code($status);

        render('auth/register-type', [
            'title' => 'Choose your account type — Scrum Master',
            'draft' => $draft,
            'type' => $type,
            'orgName' => $organizationName,
            'error' => $error,
            'flash' => $flash,
        ]);

        exit;
    }

    /**
     * Re-render step 1 with a message, keeping what the visitor typed.
     */
    private static function failDetails(
        string $message,
        string $name,
        string $email,
        ?string $avatar,
        int $status
    ): never {
        http_response_code($status);

        render('auth/register', [
            'title' => 'Create your account — Scrum Master',
            'old' => ['name' => $name, 'email' => $email],
            'avatar' => $avatar,
            'error' => $message,
            'flash' => null,
            'hasLegacyData' => self::users()->count() === 0 && self::legacyProfile() !== null,
        ]);

        exit;
    }

    /**
     * Re-render the sign-in form with a message.
     */
    private static function failLogin(string $message, string $email, int $status): never
    {
        http_response_code($status);

        render('auth/login', [
            'title' => 'Sign in — Scrum Master',
            'email' => $email,
            'error' => $message,
            'flash' => null,
        ]);

        exit;
    }

    /**
     * Remove a stored photo when the account it was meant for was not created.
     */
    private static function discardAvatar(?string $path): void
    {
        if ($path === null || $path === '') {
            return;
        }

        $file = UPLOAD_PATH . '/avatars/' . basename($path);
        if (is_file($file)) {
            @unlink($file);
        }
    }

    /**
     * Move the pre-auth profile photo and tasks into the first account.
     */
    private static function adoptLegacyData(int $userId, ?string $uploadedAvatar): void
    {
        $legacy = self::legacyProfile();

        if ($legacy !== null && $uploadedAvatar === null && !empty($legacy['avatar'])) {
            self::users()->updateAvatar($userId, (string) $legacy['avatar']);
        }

        (new TodoRepository(self::db()))->adoptOrphans($userId);
    }

    /**
     * The single profile row from the pre-auth version, if it still exists.
     */
    private static function legacyProfile(): ?array
    {
        return (new ProfileRepository(self::db()))->get();
    }

    private static function users(): UserRepository
    {
        return new UserRepository(self::db());
    }

    private static function db(): PDO
    {
        global $db;

        return $db;
    }
}
