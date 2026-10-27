<?php

/**
 * templates/profile.php
 *
 * The signed-in user's account page: photo, name, email, password and the
 * organization panel (create, add/remove members, leave).
 *
 * Variables: $user, $organization, $members, $isOwner.
 */
?>
<header class="page-header">
    <div class="page-heading">
        <h1 class="greeting">Your profile</h1>
        <p class="date-line">Account, photo and organization.</p>
    </div>

    <form method="post" action="index.php" class="signout-form">
        <?= csrf_field() ?>
        <input type="hidden" name="action" value="auth.logout">
        <button class="btn-ghost btn-small" type="submit">Sign out</button>
    </form>
</header>

<div class="profile-grid">

    <section class="card">
        <h2 class="card-title">Account</h2>
        <p class="card-sub">
            The name and email used on your account.
            <?php if (!empty($user['google_id'])): ?>
                <span class="chip chip--google">Google</span>
            <?php endif; ?>
        </p>

        <form class="avatar-form profile-photo" method="post" action="index.php" enctype="multipart/form-data">
            <?= csrf_field() ?>
            <input type="hidden" name="action" value="profile.avatar">

            <label class="avatar-picker" title="Change profile picture">
                <input type="file" name="avatar" accept="image/jpeg,image/png,image/webp,image/gif" hidden>
                <img src="<?= e(avatar_url($user['avatar'] ?? null)) ?>" alt="Profile picture">
                <span class="hint">Change</span>
            </label>

            <div class="profile-photo-text">
                <strong>Profile photo</strong>
                <span>JPEG, PNG, WebP or GIF — max 3 MB.</span>
            </div>
        </form>

        <form method="post" action="index.php" class="stack-form">
            <?= csrf_field() ?>
            <input type="hidden" name="action" value="profile.update">

            <div class="form-row">
                <label class="field">
                    <span>Name</span>
                    <input class="input" type="text" name="name" value="<?= e($user['name']) ?>" maxlength="60" required>
                </label>

                <label class="field">
                    <span>Email</span>
                    <input class="input" type="email" name="email" value="<?= e($user['email']) ?>" required>
                </label>
            </div>

            <button class="btn-primary btn-small" type="submit">Save changes</button>
        </form>

        <div class="card-section">
            <h2 class="card-title">Password</h2>

            <?php if (!empty($user['google_id']) && (string) ($user['password_hash'] ?? '') === ''): ?>
                <p class="card-sub">
                    You signed up with Google. Add a password if you also want to sign in
                    with your email address.
                </p>

                <form method="post" action="index.php" class="stack-form">
                    <?= csrf_field() ?>
                    <input type="hidden" name="action" value="profile.password">

                    <div class="form-row">
                        <label class="field">
                            <span>New password</span>
                            <input class="input" type="password" name="new_password" autocomplete="new-password" minlength="8" required>
                        </label>

                        <label class="field">
                            <span>Confirm new password</span>
                            <input class="input" type="password" name="new_password_confirm" autocomplete="new-password" minlength="8" required>
                        </label>
                    </div>

                    <button class="btn-primary btn-small" type="submit">Set password</button>
                </form>
            <?php else: ?>
                <p class="card-sub">Use at least 8 characters.</p>

                <form method="post" action="index.php" class="stack-form">
                    <?= csrf_field() ?>
                    <input type="hidden" name="action" value="profile.password">

                    <label class="field">
                        <span>Current password</span>
                        <input class="input" type="password" name="current_password" autocomplete="current-password" required>
                    </label>

                    <div class="form-row">
                        <label class="field">
                            <span>New password</span>
                            <input class="input" type="password" name="new_password" autocomplete="new-password" minlength="8" required>
                        </label>

                        <label class="field">
                            <span>Confirm new password</span>
                            <input class="input" type="password" name="new_password_confirm" autocomplete="new-password" minlength="8" required>
                        </label>
                    </div>

                    <button class="btn-primary btn-small" type="submit">Change password</button>
                </form>
            <?php endif; ?>
        </div>
    </section>

    <section class="card">
        <h2 class="card-title">Organization</h2>

        <?php if ($organization !== null): ?>

            <p class="card-sub">
                <strong><?= e($organization['name']) ?></strong>
                — <?= $isOwner ? 'organization account' : 'member' ?>
            </p>

            <ul class="member-list">
                <?php foreach ($members as $member): ?>
                    <li class="member">
                        <img src="<?= e(avatar_url($member['avatar'] ?? null)) ?>" alt="">

                        <span class="member-info">
                            <span class="member-line">
                                <span class="member-name"><?= e($member['name']) ?></span>
                                <?php if ($member['is_owner']): ?>
                                    <span class="chip chip--owner">Owner</span>
                                <?php endif; ?>
                            </span>
                            <span class="member-mail"><?= e($member['email']) ?></span>
                        </span>

                        <?php if ($isOwner && !$member['is_owner']): ?>
                            <form method="post" action="index.php" class="member-remove"
                                  data-confirm="Remove <?= e($member['name']) ?> from <?= e($organization['name']) ?>?">
                                <?= csrf_field() ?>
                                <input type="hidden" name="action" value="org.remove">
                                <input type="hidden" name="user_id" value="<?= (int) $member['id'] ?>">
                                <button class="btn-danger btn-small" type="submit">Remove</button>
                            </form>
                        <?php endif; ?>
                    </li>
                <?php endforeach; ?>
            </ul>

            <?php if ($isOwner): ?>
                <a class="btn-primary btn-small btn-block" href="index.php?r=team">View team todos</a>

                <form method="post" action="index.php" class="inline-form add-member">
                    <?= csrf_field() ?>
                    <input type="hidden" name="action" value="org.associate">

                    <label class="field">
                        <span>Add a member by email</span>
                        <input class="input" type="email" name="email" placeholder="teammate@example.com" required>
                    </label>

                    <button class="btn-primary btn-small" type="submit">Add member</button>
                </form>
            <?php else: ?>
                <form method="post" action="index.php" data-confirm="Leave <?= e($organization['name']) ?>?">
                    <?= csrf_field() ?>
                    <input type="hidden" name="action" value="org.leave">
                    <button class="btn-ghost btn-small" type="submit">Leave organization</button>
                </form>
            <?php endif; ?>

        <?php else: ?>

            <p class="card-sub">You are not associated with an organization</p>
            <form method="post" action="index.php" class="stack-form">
                <?= csrf_field() ?>
                <input type="hidden" name="action" value="org.create">

                <label class="field">
                    <span>Organization name</span>
                    <input class="input" type="text" name="org_name" placeholder="e.g. Acme Studio" maxlength="80" required>
                </label>

                <button class="btn-primary btn-small" type="submit">Create organization</button>
            </form>

        <?php endif; ?>
    </section>

</div>
