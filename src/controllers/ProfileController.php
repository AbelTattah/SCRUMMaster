<?php

/**
 * ProfileController
 *
 * Onboarding (name from the welcome modal) and profile picture uploads.
 * No auth for now — the profile is a single database row and the browser is
 * identified only by its session cookie.
 */

declare(strict_types=1);

final class ProfileController
{
    /** Maximum avatar file size: 3 MB. */
    private const MAX_AVATAR_BYTES = 3 * 1024 * 1024;

    /** MIME types we accept, mapped to a safe file extension. */
    private const AVATAR_TYPES = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
        'image/gif' => 'gif',
    ];

    /**
     * POST from the welcome modal: name (required) + optional photo.
     */
    public static function save(): never
    {
        verify_csrf();

        $name = trim((string) ($_POST['name'] ?? ''));

        if ($name === '' || str_len($name) > 60) {
            $_SESSION['flash'] = 'Please enter your name (max 60 characters).';
            redirect_back();
        }

        $profiles = self::repository();
        $profiles->saveName($name);

        // The avatar is optional during onboarding.
        if (isset($_FILES['avatar']) && $_FILES['avatar']['error'] !== UPLOAD_ERR_NO_FILE) {
            try {
                $profiles->setAvatar(self::storeAvatar($_FILES['avatar']));
            } catch (RuntimeException $e) {
                $_SESSION['flash'] = $e->getMessage();
                redirect_back();
            }
        }

        $_SESSION['flash'] = "Welcome, {$name}!";
        redirect_back();
    }

    /**
     * POST from the top bar: replace the avatar with a new photo.
     */
    public static function avatar(): never
    {
        verify_csrf();

        if (!isset($_FILES['avatar'])) {
            $_SESSION['flash'] = 'No file received.';
            redirect_back();
        }

        try {
            $path = self::storeAvatar($_FILES['avatar']);
        } catch (RuntimeException $e) {
            $_SESSION['flash'] = $e->getMessage();
            redirect_back();
        }

        $profiles = self::repository();
        $profiles->setAvatar($path);

        $_SESSION['flash'] = 'Profile picture updated.';
        redirect_back();
    }

    /**
     * Validate and store an uploaded image.
     *
     * Checks (in order): PHP upload errors, size, real image content via
     * getimagesize() (so a renamed .php file can never be uploaded), allowed
     * MIME types, then moves it to public/uploads/avatars with a random
     * name — the original filename is never trusted or reused.
     *
     * @param array{name: string, error: int, size: int, tmp_name: string} $file
     * @return string relative path stored in the profile row
     */
    private static function storeAvatar(array $file): string
    {
        if ($file['error'] !== UPLOAD_ERR_OK) {
            throw new RuntimeException('Upload failed (error code ' . (int) $file['error'] . ').');
        }

        if ((int) $file['size'] > self::MAX_AVATAR_BYTES) {
            throw new RuntimeException('Image is too large (max 3 MB).');
        }

        // getimagesize() works without the GD extension and verifies the file
        // really is an image, regardless of its claimed filename/extension.
        $info = @getimagesize($file['tmp_name']);
        if ($info === false) {
            throw new RuntimeException('That file is not a valid image.');
        }

        $mime = $info['mime'] ?? '';
        if (!isset(self::AVATAR_TYPES[$mime])) {
            throw new RuntimeException('Only JPEG, PNG, WebP or GIF images are allowed.');
        }

        $directory = UPLOAD_PATH . '/avatars';
        if (!is_dir($directory) && !mkdir($directory, 0775, true) && !is_dir($directory)) {
            throw new RuntimeException('Upload directory is missing.');
        }

        // Random name: no path traversal, no collisions, no user input.
        $filename = bin2hex(random_bytes(16)) . '.' . self::AVATAR_TYPES[$mime];
        $destination = $directory . '/' . $filename;

        if (!move_uploaded_file($file['tmp_name'], $destination)) {
            throw new RuntimeException('Could not save the uploaded image.');
        }

        self::deleteOldAvatar();

        return 'uploads/avatars/' . $filename;
    }

    /**
     * Remove the previously stored avatar so uploads don't pile up on disk.
     */
    private static function deleteOldAvatar(): void
    {
        $current = self::repository()->get()['avatar'] ?? null;

        if (!is_string($current) || $current === '') {
            return;
        }

        // Only ever delete inside uploads/avatars (basename strips any
        // directory components a tampered value might contain).
        $old = UPLOAD_PATH . '/avatars/' . basename($current);
        if (is_file($old)) {
            @unlink($old);
        }
    }

    private static function repository(): ProfileRepository
    {
        global $db;

        return new ProfileRepository($db);
    }
}
