<?php

/**
 * templates/modals/todo-form.php
 *
 * Shared "Add Todo" / "Edit Todo" modal.
 *
 * $editTodo — the todo being edited, or null when adding.
 * $openAdd  — true when the URL carried ?add=1.
 *
 * The modal is server-rendered open when the URL says so (works without
 * JavaScript); app.js re-uses the same markup for in-page opening.
 */

$isEdit = is_array($editTodo);
$modalOpen = $openAdd || $isEdit;
?>
<div class="modal-backdrop<?= $modalOpen ? ' is-open' : '' ?>" id="todo-modal">
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="todo-modal-title">

        <form method="post" action="index.php" class="modal-form">
            <?= csrf_field() ?>
            <input type="hidden" name="action" value="<?= $isEdit ? 'todo.update' : 'todo.create' ?>">
            <input type="hidden" name="return_to" value="<?= e($returnTo) ?>">
            <?php if ($isEdit): ?>
                <input type="hidden" name="id" value="<?= (int) $editTodo['id'] ?>">
            <?php endif; ?>

            <h2 id="todo-modal-title"><?= $isEdit ? 'Edit Todo' : 'Add Todo' ?></h2>
            <p class="modal-sub">
                <?= $isEdit ? 'Update the details of this task.' : 'What would you like to get done?' ?>
            </p>

            <label class="field">
                <span>Title</span>
                <input
                    class="input"
                    type="text"
                    name="title"
                    maxlength="200"
                    required
                    placeholder="e.g. Jogging"
                    value="<?= $isEdit ? e($editTodo['title']) : '' ?>"
                >
            </label>

            <div class="time-row">
                <label class="field">
                    <span>Start time</span>
                    <input
                        class="input"
                        type="time"
                        name="start_time"
                        value="<?= $isEdit ? e((string) ($editTodo['start_time'] ?? '')) : '' ?>"
                    >
                </label>

                <label class="field">
                    <span>End time</span>
                    <input
                        class="input"
                        type="time"
                        name="end_time"
                        value="<?= $isEdit ? e((string) ($editTodo['end_time'] ?? '')) : '' ?>"
                    >
                </label>
            </div>

            <div class="modal-actions">
                <button type="button" class="btn-ghost" data-modal-close>Cancel</button>
                <button type="submit" class="btn-primary">
                    <?= $isEdit ? 'Save Changes' : 'Add Todo' ?>
                </button>
            </div>
        </form>

    </div>
</div>
