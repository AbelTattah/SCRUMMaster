<?php

/**
 * HomeController
 *
 * Renders the homepage (the screen from ui-design/home-page.png): sidebar,
 * top bar, greeting, task list and the modals.
 */

declare(strict_types=1);

final class HomeController
{
    public static function index(): void
    {
        global $db;

        $profiles = new ProfileRepository($db);
        $todoRepo = new TodoRepository($db);

        $profile = $profiles->get();

        // A brand new visitor has no saved name → show the welcome modal.
        $showOnboarding = $profile === null || trim((string) $profile['name']) === '';

        // Sidebar filter: home (all) | completed | in-progress.
        $page = (string) ($_GET['page'] ?? 'home');
        if (!in_array($page, ['home', 'completed', 'in-progress'], true)) {
            $page = 'home';
        }

        // Top-bar search box (submitted as a GET form).
        $q = trim((string) ($_GET['q'] ?? ''));

        // Opening ?edit=ID (from the kebab menu) preloads the edit modal,
        // opening ?add=1 opens the "Add Todo" modal — both work without JS.
        $editTodo = null;
        if (!empty($_GET['edit'])) {
            $editTodo = $todoRepo->find((int) $_GET['edit']);
        }
        $openAdd = isset($_GET['add']);

        $name = $showOnboarding ? 'there' : trim((string) $profile['name']);

        // One-shot message from the previous POST (avatar upload errors etc).
        $flash = $_SESSION['flash'] ?? null;
        unset($_SESSION['flash']);

        render('layout', [
            'profile' => $profile,
            'showOnboarding' => $showOnboarding,
            'page' => $page,
            'q' => $q,
            'todos' => $todoRepo->all($page, $q),
            'counts' => $todoRepo->counts(),
            'greeting' => greeting_for($name),
            'today' => today_line(),
            'editTodo' => $editTodo,
            'openAdd' => $openAdd,
            'returnTo' => return_to_value(),
            'flash' => $flash,
        ]);
    }
}
