<?php

/**
 * TeamController
 *
 * Read-only overview for the organization account: every task belonging to
 * every member of the organization, with the member it belongs to.
 *
 * Only the organization account (organizations.owner_id) may open this page;
 * members keep their own private list.
 */

declare(strict_types=1);

final class TeamController
{
    public static function index(): void
    {
        global $db;

        $user = require_auth();
        $organization = user_organization($user);

        if ($organization === null) {
            flash('Create an organization to see team todos.');
            redirect('index.php?r=profile');
        }

        if (!is_org_owner($user)) {
            flash('Only the organization account can see team todos.');
            redirect('index.php');
        }

        $page = (string) ($_GET['page'] ?? 'home');
        if (!in_array($page, ['home', 'completed', 'in-progress'], true)) {
            $page = 'home';
        }

        $q = trim((string) ($_GET['q'] ?? ''));

        $todoRepo = new TodoRepository($db);

        render('layout', [
            'view' => 'team',
            'title' => 'KPIMe — Team',
            'showTodoModal' => false,
            'user' => $user,
            'page' => 'home',
            'q' => $q,
            'searchRoute' => 'team',
            'counts' => $todoRepo->counts((int) $user['id']),
            'returnTo' => return_to_value(),
            'flash' => take_flash(),
            'organization' => $organization,
            'members' => (new UserRepository($db))->members($organization['id']),
            'todos' => $todoRepo->forOrganization($organization['id'], $page, $q),
            'filter' => $page,
        ]);
    }
}
