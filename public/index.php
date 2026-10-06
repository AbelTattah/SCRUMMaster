<?php

/**
 * public/index.php — front controller (the web root).
 *
 * Every page and every action flows through this file:
 *
 *   GET  /                    → render the homepage
 *   GET  /?page=completed     → filtered list (sidebar links)
 *   GET  /?q=jog              → search results (top bar form)
 *   GET  /?add=1 | /?edit=ID  → homepage with the matching modal open
 *   POST action=todo.*        → create / toggle / update / delete
 *   POST action=profile.*     → onboarding name + avatar upload
 *
 * Keeping all entry points in one place means redirects, CSRF checks and
 * error handling are applied consistently — and no endpoint can ever be
 * "required" by another page (the bug that originally produced a blank
 * screen in this project).
 */

declare(strict_types=1);

require __DIR__ . '/../src/bootstrap.php';

$action = (string) ($_POST['action'] ?? '');

switch ($action) {
    case 'todo.create':
        TodoController::create();
        break;

    case 'todo.toggle':
        TodoController::toggle();
        break;

    case 'todo.update':
        TodoController::update();
        break;

    case 'todo.delete':
        TodoController::destroy();
        break;

    case 'profile.save':
        ProfileController::save();
        break;

    case 'profile.avatar':
        ProfileController::avatar();
        break;

    default:
        HomeController::index();
}
