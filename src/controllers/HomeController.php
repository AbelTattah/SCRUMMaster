<?php

/**
 * HomeController
 *
 * Renders the homepage (the screen from ui-design/home-page.png): sidebar,
 * top bar, greeting, task list and the modals — scoped to the signed-in user.
 */

declare(strict_types=1);

final class HomeController
{
    public static function index(): void
    {
        global $db;

        $user = require_auth();
        $userId = (int) $user['id'];

        $todoRepo = new TodoRepository($db);

        // Sidebar filter: home (all) | completed | in-progress.
        $page = (string) ($_GET['page'] ?? 'home');
        if (!in_array($page, ['home', 'completed', 'in-progress'], true)) {
            $page = 'home';
        }

        // Top-bar search box (submitted as a GET form).
        $q = trim((string) ($_GET['q'] ?? ''));

        // Opening ?edit=ID (from the kebab menu) preloads the edit modal,
        // opening ?add=1 opens the "Add Todo" modal — both work without JS.
        // find() is scoped to the user, so a foreign id simply returns null.
        $editTodo = null;
        if (!empty($_GET['edit'])) {
            $editTodo = $todoRepo->find((int) $_GET['edit'], $userId);
        }
        $openAdd = isset($_GET['add']);

        render('layout', [
            'view' => 'home',
            'title' => 'KPIMe — Home',
            'showTodoModal' => true,
            'user' => $user,
            'page' => $page,
            'q' => $q,
            'searchRoute' => '',
            'todos' => $todoRepo->all($userId, $page, $q),
            'counts' => $todoRepo->counts($userId),
            'greeting' => greeting_for((string) $user['name']),
            'today' => today_line(),
            'editTodo' => $editTodo,
            'openAdd' => $openAdd,
            'returnTo' => return_to_value(),
            'flash' => take_flash(),
        ]);
    }
}
