<?php

/**
 * ProfileController
 *
 * The signed-in user's own account page: photo, name, email, password and
 * organization membership (create an organization, add/remove members, leave).
 * Every action is CSRF-checked and scoped to the current user.
 */

declare(strict_types=1);

final class ProfileController
{
    /** Minimum password length (characters). */
    private const MIN_PASSWORD = 8;

    /** bcrypt silently ignores anything past 72 bytes — reject instead. */
    private const MAX_PASSWORD_BYTES = 72;

    public static function show(): void
    {
        global $db;

        $user = require_auth();
        $organization = user_organization($user);

        $users = new UserRepository($db);

        render('layout', [
            'view' => 'profile',
            'title' => 'KPIMe — Profile',
            'showTodoModal' => false,
            'user' => $user,
            'page' => 'home',
            'q' => '',
            'searchRoute' => '',
            'counts' => (new TodoRepository($db))->counts((int) $user['id']),
            'returnTo' => '',
            'flash' => take_flash(),
            'organization' => $organization,
            'members' => $organization !== null ? $users->members($organization['id']) : [],
            'isOwner' => is_org_owner($user),
        ]);
    }

    /**
     * Name + email.
     */
    public static function update(): never
    {
        verify_csrf();

        $user = require_auth();
        $userId = (int) $user['id'];

        $name = trim((string) ($_POST['name'] ?? ''));
        $email = strtolower(trim((string) ($_POST['email'] ?? '')));

        if ($name === '' || str_len($name) > 60) {
            flash('Please enter your name (max 60 characters).');
            redirect('index.php?r=profile');
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || str_len($email) > 190) {
            flash('Please enter a valid email address.');
            redirect('index.php?r=profile');
        }

        $users = self::users();
        $existing = $users->findByEmail($email);

        if ($existing !== null && (int) $existing['id'] !== $userId) {
            flash('That email is already registered to another account.');
            redirect('index.php?r=profile');
        }

        $users->updateProfile($userId, $name, $email);

        flash('Profile updated.');
        redirect('index.php?r=profile');
    }

    /**
     * Replace the profile picture (the form auto-submits when a file is
     * chosen — see app.js).
     */
    public static function avatar(): never
    {
        verify_csrf();

        $user = require_auth();

        if (!isset($_FILES['avatar']) || $_FILES['avatar']['error'] === UPLOAD_ERR_NO_FILE) {
            flash('No file received.');
            redirect('index.php?r=profile');
        }

        try {
            $path = store_avatar($_FILES['avatar'], $user['avatar'] ?? null);
        } catch (RuntimeException $e) {
            flash($e->getMessage());
            redirect('index.php?r=profile');
        }

        self::users()->updateAvatar((int) $user['id'], $path);

        flash('Profile picture updated.');
        redirect('index.php?r=profile');
    }

    /**
     * Change the password: the current one must be known — except for accounts
     * created with Google only, which have no password yet ("Set password").
     */
    public static function password(): never
    {
        verify_csrf();

        $user = require_auth();

        $current = (string) ($_POST['current_password'] ?? '');
        $new = (string) ($_POST['new_password'] ?? '');
        $confirm = (string) ($_POST['new_password_confirm'] ?? '');

        $hash = (string) ($user['password_hash'] ?? '');

        if ($hash !== '' && !password_verify($current, $hash)) {
            flash('Your current password is incorrect.');
            redirect('index.php?r=profile');
        }

        if (str_len($new) < self::MIN_PASSWORD) {
            flash('Your new password must be at least ' . self::MIN_PASSWORD . ' characters.');
            redirect('index.php?r=profile');
        }

        if (strlen($new) > self::MAX_PASSWORD_BYTES) {
            flash('Your new password is too long (max 72 characters).');
            redirect('index.php?r=profile');
        }

        if ($new !== $confirm) {
            flash('The two new passwords do not match.');
            redirect('index.php?r=profile');
        }

        self::users()->updatePassword((int) $user['id'], password_hash($new, PASSWORD_DEFAULT));

        flash($hash !== ''
            ? 'Password changed.'
            : 'Password set — you can now sign in with your email and password too.');
        redirect('index.php?r=profile');
    }

    /**
     * Turn a personal account into an organization account.
     */
    public static function createOrganization(): never
    {
        verify_csrf();

        $user = require_auth();
        $userId = (int) $user['id'];

        if (user_organization($user) !== null) {
            flash('You already belong to an organization.');
            redirect('index.php?r=profile');
        }

        $name = trim((string) ($_POST['org_name'] ?? ''));

        if (str_len($name) < 2 || str_len($name) > 80) {
            flash('Please enter an organization name (2–80 characters).');
            redirect('index.php?r=profile');
        }

        global $db;

        $organizationId = (new OrganizationRepository($db))->create($name, $userId);
        self::users()->setOrganization($userId, $organizationId);

        flash('Organization created. This account is now the organization account.');
        redirect('index.php?r=profile');
    }

    /**
     * Organization account: associate an existing account by email.
     */
    public static function associate(): never
    {
        verify_csrf();

        $user = require_auth();
        $organization = self::requireOwner($user);

        $email = strtolower(trim((string) ($_POST['email'] ?? '')));

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            flash('Please enter a valid email address.');
            redirect('index.php?r=profile');
        }

        $users = self::users();
        $member = $users->findByEmail($email);

        if ($member === null) {
            flash('No account uses that email yet. Ask them to sign up first, then add them.');
            redirect('index.php?r=profile');
        }

        if ((int) $member['id'] === (int) $user['id']) {
            flash('That is your own account.');
            redirect('index.php?r=profile');
        }

        if ((int) ($member['organization_id'] ?? 0) === $organization['id']) {
            flash($member['name'] . ' is already in your organization.');
            redirect('index.php?r=profile');
        }

        if (!empty($member['organization_id'])) {
            flash($member['name'] . ' already belongs to another organization.');
            redirect('index.php?r=profile');
        }

        $users->setOrganization((int) $member['id'], $organization['id']);

        flash($member['name'] . ' was added to ' . $organization['name'] . '.');
        redirect('index.php?r=profile');
    }

    /**
     * Organization account: remove a member (their tasks stay with them).
     */
    public static function removeMember(): never
    {
        verify_csrf();

        $user = require_auth();
        $organization = self::requireOwner($user);

        $memberId = (int) ($_POST['user_id'] ?? 0);

        if ($memberId === (int) $user['id']) {
            flash('You cannot remove your own account.');
            redirect('index.php?r=profile');
        }

        $member = self::users()->findWithOrganization($memberId);

        if ($member === null || (int) ($member['organization_id'] ?? 0) !== $organization['id']) {
            flash('That account is not a member of your organization.');
            redirect('index.php?r=profile');
        }

        self::users()->setOrganization($memberId, null);

        flash($member['name'] . ' was removed from ' . $organization['name'] . '.');
        redirect('index.php?r=profile');
    }

    /**
     * A member (not the organization account) can leave.
     */
    public static function leaveOrganization(): never
    {
        verify_csrf();

        $user = require_auth();
        $organization = user_organization($user);

        if ($organization === null) {
            flash('You are not part of an organization.');
            redirect('index.php?r=profile');
        }

        if (is_org_owner($user)) {
            flash('The organization account cannot leave its own organization.');
            redirect('index.php?r=profile');
        }

        self::users()->setOrganization((int) $user['id'], null);

        flash('You left ' . $organization['name'] . '.');
        redirect('index.php?r=profile');
    }

    /**
     * @return array{id: int, name: string, owner_id: int}
     */
    private static function requireOwner(array $user): array
    {
        $organization = user_organization($user);

        if ($organization === null || !is_org_owner($user)) {
            flash('Only the organization account can manage members.');
            redirect('index.php?r=profile');
        }

        return $organization;
    }

    private static function users(): UserRepository
    {
        global $db;

        return new UserRepository($db);
    }
}
