<?php

/**
 * templates/partials/confirm-modal.php
 *
 * One reusable "are you sure?" dialog. Any form can opt in with:
 *
 *   data-confirm="Message shown in the dialog"
 *   data-confirm-title="Dialog heading"          (optional)
 *   data-confirm-label="Confirm button label"    (optional)
 *
 * app.js intercepts the submit, fills this dialog in and submits the form
 * only after the confirm button is pressed. Without JavaScript the form posts
 * immediately, exactly as before.
 */
?>
<div class="modal-backdrop" id="confirm-modal">
    <div class="modal modal--confirm" role="dialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-message">
        <h2 id="confirm-title" data-confirm-title-text>Are you sure?</h2>
        <p class="modal-sub" id="confirm-message" data-confirm-message></p>

        <div class="modal-actions">
            <button class="btn-ghost" type="button" data-modal-close>Cancel</button>
            <button class="btn-primary" type="button" data-confirm-accept>Confirm</button>
        </div>
    </div>
</div>
