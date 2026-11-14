import Link from "next/link";

export function GuestSignInRequired({
  title = "Sign in required",
  description = "This feature is available when you sign in. You can continue using tasks and sprints in guest mode.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="page">
      <header className="page-header">
        <div className="page-heading">
          <h1 className="greeting">{title}</h1>
          <p className="date-line">{description}</p>
        </div>
      </header>

      <section className="panel">
        <p className="hint-text" style={{ marginBottom: 16 }}>
          Create an account or sign in to sync your data, access reports, manage your profile, and collaborate with your team.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link className="btn-add" href="/login">
            Sign in
          </Link>
          <Link className="btn-small" href="/register">
            Create account
          </Link>
          <Link className="btn-small" href="/">
            Back to tasks
          </Link>
        </div>
      </section>
    </div>
  );
}
