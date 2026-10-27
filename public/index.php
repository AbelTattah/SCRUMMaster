<?php

/**
 * public/index.php — front controller (the web root).
 *
 * Every page and every action flows through this file:
 *
 *   GET  /                    → homepage (signed in)
 *   GET  /?page=completed     → filtered list (sidebar links)
 *   GET  /?q=jog              → search results (top bar form)
 *   GET  /?add=1 | /?edit=ID  → homepage with the matching modal open
 *   GET  /?r=login|register   → authentication screens (guests only)
 *   GET  /?r=register&step=2  → sign-up step 2 (account type)
 *   GET  /?r=auth.google      → start Google sign-in
 *   GET  /?r=auth.google.callback → Google sends the visitor back here
 *   GET  /?r=profile          → account + organization page
 *   GET  /?r=team             → organization account: all members' todos
 *   POST action=auth.*        → sign in / sign up / sign out
 *   POST action=todo.*        → create / toggle / update / delete
 *   POST action=profile.*     → name, email, photo, password
 *   POST action=org.*         → create organization, add/remove members, leave
 *
 * Keeping all entry points in one place means redirects, CSRF checks and
 * error handling are applied consistently — and no endpoint can ever be
 * "required" by another page (the bug that originally produced a blank
 * screen in this project).
 */

declare(strict_types=1);

require __DIR__ . '/../src/bootstrap.php';

$action = (string) ($_POST['action'] ?? '');

if ($action !== '') {
    switch ($action) {
        // --- authentication ------------------------------------------------
        case 'auth.login':
            AuthController::login();
            break;

        case 'auth.register.step1':
            AuthController::registerDetails();
            break;

        case 'auth.register.step2':
            AuthController::registerAccount();
            break;

        case 'auth.logout':
            AuthController::logout();
            break;

        // --- todos ---------------------------------------------------------
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

        // --- profile -------------------------------------------------------
        case 'profile.update':
            ProfileController::update();
            break;

        case 'profile.avatar':
            ProfileController::avatar();
            break;

        case 'profile.password':
            ProfileController::password();
            break;

        // --- organization --------------------------------------------------
        case 'org.create':
            ProfileController::createOrganization();
            break;

        case 'org.associate':
            ProfileController::associate();
            break;

        case 'org.remove':
            ProfileController::removeMember();
            break;

        case 'org.leave':
            ProfileController::leaveOrganization();
            break;
    }

    // Unknown actions fall through to the page renderer below.
}

switch ((string) ($_GET['r'] ?? '')) {
    case 'login':
        AuthController::showLogin();
        break;

    case 'register':
        // Step 1 by default; step 2 is the account-type screen.
        if ((string) ($_GET['step'] ?? '') === '2') {
            AuthController::showAccountType();
        } elseif ((string) ($_GET['cancel'] ?? '') === '1') {
            AuthController::cancelDraft();
        } else {
            AuthController::showRegister();
        }
        break;

    case 'auth.google':
        AuthController::googleStart();
        break;

    case 'auth.google.callback':
        AuthController::googleCallback();
        break;

    case 'profile':
        ProfileController::show();
        break;

    case 'team':
        TeamController::index();
        break;

    default:
        HomeController::index();
}
