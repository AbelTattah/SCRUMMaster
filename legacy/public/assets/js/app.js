/**
 * KPIMe — page behaviour.
 *
 * Everything here is progressive enhancement: the page works without
 * JavaScript (modals are opened server-side via ?add=1 / ?edit=ID, the row
 * menu is a native <details>, forms post normally, confirmations submit
 * straight away). This file only makes the interactions feel instant.
 */
(function () {
    'use strict';

    var todoModal = document.getElementById('todo-modal');
    var confirmModal = document.getElementById('confirm-modal');
    var pendingForm = null;

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

            if (backdrop.id === 'confirm-modal') {
                pendingForm = null;
            }
        }
    }

    /* ------------------------------------------------------------------
       Confirmation dialog (replaces window.confirm)
       ------------------------------------------------------------------ */
    function askConfirmation(form) {
        var message = form.getAttribute('data-confirm') || '';

        if (!confirmModal) {
            // The dialog is rendered by the layout; if it is ever missing,
            // fall back to the browser's own confirmation.
            return window.confirm(message);
        }

        pendingForm = form;

        var title = form.getAttribute('data-confirm-title') || 'Are you sure?';
        var label = form.getAttribute('data-confirm-label') || 'Confirm';

        var titleEl = confirmModal.querySelector('[data-confirm-title-text]');
        var messageEl = confirmModal.querySelector('[data-confirm-message]');
        var acceptEl = confirmModal.querySelector('[data-confirm-accept]');

        if (titleEl) {
            titleEl.textContent = title;
        }
        if (messageEl) {
            messageEl.textContent = message;
        }
        if (acceptEl) {
            acceptEl.textContent = label;
        }

        openModal('confirm-modal');

        return false;
    }

    if (confirmModal) {
        var acceptButton = confirmModal.querySelector('[data-confirm-accept]');

        if (acceptButton) {
            acceptButton.addEventListener('click', function () {
                var form = pendingForm;

                pendingForm = null;
                closeModal(confirmModal);

                if (!form) {
                    return;
                }

                // The submit handler below lets a marked form through once.
                form.setAttribute('data-confirmed', '1');

                if (form.requestSubmit) {
                    form.requestSubmit();
                } else {
                    form.submit();
                }

                window.setTimeout(function () {
                    form.removeAttribute('data-confirmed');
                }, 0);
            });
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
       Destructive actions ask first. Without JavaScript the form posts
       straight away, which is the same fallback as before.
       ------------------------------------------------------------------ */
    document.addEventListener('submit', function (event) {
        var form = event.target;

        if (!form.hasAttribute || !form.hasAttribute('data-confirm')) {
            return;
        }

        // Already confirmed in the dialog — let this submission through.
        if (form.hasAttribute('data-confirmed')) {
            return;
        }

        event.preventDefault();
        askConfirmation(form);
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
       Browser notifications
       ------------------------------------------------------------------
       The server decides what is actionable (overdue + starting soon);
       this only asks the browser to show it. A localStorage marker keeps
       the same notification from popping up on every poll.
       ------------------------------------------------------------------ */
    var notifyFeed = document.body.getAttribute('data-notifications-feed');
    var browserNotifyEnabled = document.body.getAttribute('data-browser-notifications') === '1';
    var NOTIFIED_PREFIX = 'kpime.notified.';
    var NOTIFIED_TTL = 12 * 60 * 60 * 1000; // 12 hours

    function notificationsSupported() {
        return typeof window.Notification !== 'undefined';
    }

    function pruneNotified() {
        try {
            var now = Date.now();

            for (var i = localStorage.length - 1; i >= 0; i--) {
                var key = localStorage.key(i);

                if (key && key.indexOf(NOTIFIED_PREFIX) === 0) {
                    var at = parseInt(localStorage.getItem(key), 10);

                    if (!at || now - at > NOTIFIED_TTL) {
                        localStorage.removeItem(key);
                    }
                }
            }
        } catch (error) {
            // Private mode / storage disabled — notifications still work,
            // they just are not de-duplicated across reloads.
        }
    }

    function alreadyNotified(key) {
        try {
            return Boolean(localStorage.getItem(NOTIFIED_PREFIX + key));
        } catch (error) {
            return false;
        }
    }

    function markNotified(key) {
        try {
            localStorage.setItem(NOTIFIED_PREFIX + key, String(Date.now()));
        } catch (error) {
            // Ignore storage failures.
        }
    }

    function showBrowserNotification(item) {
        if (alreadyNotified(item.key)) {
            return;
        }

        var alert = new window.Notification(item.title, {
            body: item.detail,
            tag: item.key,
            icon: 'assets/img/default-avatar.png',
            data: { url: 'index.php?r=notifications' }
        });

        alert.onclick = function () {
            window.focus();
            alert.close();
            window.location.href = 'index.php?r=notifications';
        };

        markNotified(item.key);
    }

    function pollNotifications() {
        if (!notifyFeed || !browserNotifyEnabled) {
            return;
        }

        if (!notificationsSupported() || window.Notification.permission !== 'granted') {
            return;
        }

        if (document.hidden) {
            return;
        }

        fetch(notifyFeed, {
            credentials: 'same-origin',
            headers: { 'Accept': 'application/json' }
        })
            .then(function (response) {
                return response.ok ? response.json() : null;
            })
            .then(function (data) {
                if (!data || !Array.isArray(data.items)) {
                    return;
                }

                data.items.forEach(showBrowserNotification);
            })
            .catch(function () {
                // A failed poll is not worth interrupting the page for.
            });
    }

    if (notifyFeed && browserNotifyEnabled && notificationsSupported()) {
        pruneNotified();
        pollNotifications();

        window.setInterval(pollNotifications, 60000);

        document.addEventListener('visibilitychange', function () {
            if (!document.hidden) {
                pollNotifications();
            }
        });
    }

    /* ------------------------------------------------------------------
       Settings: browser permission status + request button
       ------------------------------------------------------------------ */
    var notifyStatus = document.querySelector('[data-notify-status]');
    var notifyRequest = document.querySelector('[data-notify-request]');

    function permissionState() {
        if (!notificationsSupported()) {
            return {
                state: 'unsupported',
                label: 'This browser does not support notifications.'
            };
        }

        if (window.Notification.permission === 'granted') {
            return {
                state: 'granted',
                label: 'Browser notifications are allowed for this site.'
            };
        }

        if (window.Notification.permission === 'denied') {
            return {
                state: 'denied',
                label: 'Browser notifications are blocked. Allow them in your browser site settings.'
            };
        }

        return {
            state: 'default',
            label: 'Browser notifications have not been enabled yet.'
        };
    }

    function syncPermissionUi() {
        var info = permissionState();

        if (notifyStatus) {
            notifyStatus.textContent = info.label;
            notifyStatus.setAttribute('data-state', info.state);
        }

        if (notifyRequest) {
            notifyRequest.disabled = info.state === 'granted' || info.state === 'unsupported';
            notifyRequest.textContent = info.state === 'granted'
                ? 'Notifications allowed'
                : 'Allow browser notifications';
        }
    }

    if (notifyStatus || notifyRequest) {
        syncPermissionUi();

        if (notifyRequest && notificationsSupported()) {
            notifyRequest.addEventListener('click', function () {
                window.Notification.requestPermission().then(function () {
                    syncPermissionUi();

                    if (window.Notification.permission === 'granted') {
                        browserNotifyEnabled = true;
                        pollNotifications();
                    }
                });
            });
        }
    }

    // Exposed for debugging in the console.
    window.KPIMe = {
        openModal: openModal,
        closeModal: closeModal,
        todoModal: todoModal,
        pollNotifications: pollNotifications
    };
})();
