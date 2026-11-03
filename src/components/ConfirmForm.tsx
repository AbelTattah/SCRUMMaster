"use client";

import { useRef, useState, useTransition, type ReactNode } from "react";

type Action = (formData: FormData) => void | Promise<void>;

export function ConfirmForm({
  action,
  className,
  confirmTitle = "Are you sure?",
  confirmMessage,
  confirmLabel = "Confirm",
  children,
}: {
  action: Action;
  className?: string;
  confirmTitle?: string;
  confirmMessage: string;
  confirmLabel?: string;
  children: ReactNode;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function accept() {
    const form = formRef.current;

    if (!form) {
      return;
    }

    const data = new FormData(form);

    startTransition(async () => {
      try {
        await action(data);
      } finally {
        setOpen(false);
      }
    });
  }

  return (
    <>
      <form
        ref={formRef}
        action={action}
        className={className}
        onSubmit={(event) => {
          event.preventDefault();
          setOpen(true);
        }}
      >
        {children}
      </form>

      {open ? (
        <div
          className="modal-backdrop is-open"
          id="confirm-modal"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setOpen(false);
            }
          }}
        >
          <div
            className="modal modal--confirm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby="confirm-message"
          >
            <h2 id="confirm-title">{confirmTitle}</h2>
            <p className="modal-sub" id="confirm-message">
              {confirmMessage}
            </p>

            <div className="modal-actions">
              <button
                className="btn-ghost"
                type="button"
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                Cancel
              </button>
              <button className="btn-primary" type="button" onClick={accept} disabled={pending}>
                {pending ? "Working…" : confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
