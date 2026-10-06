<?php

/**
 * TodoController
 *
 * All state-changing todo actions. Every action validates the CSRF token and
 * then redirects (Post/Redirect/Get) back to the list the user came from.
 */

declare(strict_types=1);

final class TodoController
{
    public static function create(): never
    {
        verify_csrf();

        $title = trim((string) ($_POST['title'] ?? ''));

        if ($title === '' || str_len($title) > 200) {
            $_SESSION['flash'] = 'Please enter a todo title.';
            redirect_back();
        }

        self::repository()->create(
            $title,
            sanitize_time($_POST['start_time'] ?? null),
            sanitize_time($_POST['end_time'] ?? null)
        );

        redirect_back();
    }

    /**
     * Checkbox toggle (POST from the row's form).
     */
    public static function toggle(): never
    {
        verify_csrf();

        $id = (int) ($_POST['id'] ?? 0);
        if ($id > 0) {
            self::repository()->toggle($id);
        }

        redirect_back();
    }

    public static function update(): never
    {
        verify_csrf();

        $id = (int) ($_POST['id'] ?? 0);
        $title = trim((string) ($_POST['title'] ?? ''));

        $todo = $id > 0 ? self::repository()->find($id) : null;

        if ($todo === null) {
            $_SESSION['flash'] = 'That todo no longer exists.';
            redirect_back();
        }

        if ($title === '' || str_len($title) > 200) {
            $_SESSION['flash'] = 'Please enter a todo title.';
            redirect_back();
        }

        self::repository()->update(
            $id,
            $title,
            sanitize_time($_POST['start_time'] ?? null),
            sanitize_time($_POST['end_time'] ?? null)
        );

        redirect_back();
    }

    public static function destroy(): never
    {
        verify_csrf();

        $id = (int) ($_POST['id'] ?? 0);
        if ($id > 0) {
            self::repository()->delete($id);
        }

        redirect_back();
    }

    private static function repository(): TodoRepository
    {
        global $db;

        return new TodoRepository($db);
    }
}
