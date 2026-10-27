/**
 * KPIMe — homepage behaviour.
 *
 * Everything here is progressive enhancement: the page works without
 * JavaScript (modals are opened server-side via ?add=1 / ?edit=ID, the row
 * menu is a native <details>, forms post normally). This file only makes the
 * interactions feel instant.
 */
(function () {
    'use strict';

    var todoModal = document.getElementById('todo-modal');

    /** Open a modal that lives in a .modal-backdrop container. */
    function openModal(id) {
        var backdrop = document.getElementById(id);
        if (backdrop) {
            backdrop.classList.add('is-open');
            var first = backdrop.querySelector('input:not([type=hidden]), button');
            if (first) {
                first.focus();
            }
        }
    }

    /** Close a backdrop unless it is the forced welcome screen. */
    function closeModal(backdrop) {
        if (backdrop && !backdrop.hasAttribute('data-no-dismiss')) {
            backdrop.classList.remove('is-open');
        }
    }

    /* ------------------------------------------------------------------
       Modal triggers, close buttons, backdrop clicks
       ------------------------------------------------------------------ */
    document.addEventListener('click', function (event) {
        var opener = event.target.closest('[data-modal-open]');
        if (opener) {
            event.preventDefault(); // no full page reload needed
            openModal(opener.getAttribute('data-modal-open'));
            return;
        }

        var closer = event.target.closest('[data-modal-close]');
        if (closer) {
            event.preventDefault();
            closeModal(closer.closest('.modal-backdrop'));
            return;
        }

        // Click on the dimmed area (outside the card) dismisses the modal.
        if (event.target.classList && event.target.classList.contains('modal-backdrop')) {
            closeModal(event.target);
        }

        // Click anywhere outside an open row menu closes it.
        document.querySelectorAll('details.kebab[open]').forEach(function (details) {
            if (!details.contains(event.target)) {
                details.removeAttribute('open');
            }
        });
    });

    /* ------------------------------------------------------------------
       Escape closes the top-most dismissible modal / open row menu
       ------------------------------------------------------------------ */
    document.addEventListener('keydown', function (event) {
        if (event.key !== 'Escape') {
            return;
        }

        var openMenus = document.querySelectorAll('details.kebab[open]');
        openMenus.forEach(function (details) {
            details.removeAttribute('open');
        });

        var openBackdrops = document.querySelectorAll('.modal-backdrop.is-open');
        if (openBackdrops.length) {
            closeModal(openBackdrops[openBackdrops.length - 1]);
        }
    });

    /* ------------------------------------------------------------------
       Checkbox toggle: auto-submit its tiny form so the state is saved
       immediately (the row is re-rendered with the new state).
       ------------------------------------------------------------------ */
    document.addEventListener('change', function (event) {
        // Avatar chosen on the profile page → submit the upload form right away.
        if (event.target.matches('.avatar-form input[type=file]')) {
            if (event.target.files && event.target.files.length) {
                event.target.form.submit();
            }
            return;
        }

        // Sign-up photo → live preview before the account is created.
        if (event.target.matches('[data-avatar-input]')) {
            var file = event.target.files && event.target.files[0];
            var preview = document.querySelector('[data-avatar-preview]');
            if (file && preview) {
                var reader = new FileReader();
                reader.onload = function (loadEvent) {
                    preview.src = loadEvent.target.result;
                };
                reader.readAsDataURL(file);
            }
            return;
        }

        if (event.target.matches('.todo-check')) {
            event.target.form.requestSubmit();
        }
    });

    /* ------------------------------------------------------------------
       Search: pressing the clear (×) of an emptied box should also reset
       the filter — submit the form when the value is cleared.
       ------------------------------------------------------------------ */
    var searchInput = document.querySelector('.search input[name=q]');
    if (searchInput) {
        searchInput.addEventListener('keydown', function (event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                searchInput.form.submit();
            }
        });
    }

    /* ------------------------------------------------------------------
       Sign-up: the organization name only applies to organization accounts
       (the field stays visible without JS — the server ignores it then).
       ------------------------------------------------------------------ */
    var accountTypes = document.querySelectorAll('[data-account-type]');
    var orgField = document.querySelector('[data-org-field]');

    function syncOrgField() {
        var selected = document.querySelector('[data-account-type]:checked');
        if (orgField) {
            orgField.hidden = !selected || selected.value !== 'organization';
        }
    }

    if (accountTypes.length && orgField) {
        accountTypes.forEach(function (input) {
            input.addEventListener('change', syncOrgField);
        });
        syncOrgField();
    }

    /* ------------------------------------------------------------------
       Destructive actions (remove member, leave organization) ask first.
       ------------------------------------------------------------------ */
    document.addEventListener('submit', function (event) {
        var form = event.target;
        var message = form.hasAttribute && form.hasAttribute('data-confirm')
            ? form.getAttribute('data-confirm')
            : null;

        if (message && !window.confirm(message)) {
            event.preventDefault();
        }
    });

    // Exposed for debugging in the console.
    window.KPIMe = { openModal: openModal, closeModal: closeModal, todoModal: todoModal };
})();
