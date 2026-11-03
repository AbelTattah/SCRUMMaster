import Link from "next/link";

import { Icon } from "@/components/icons";

/**
 * The public landing page shown to signed-out visitors at "/".
 *
 * Structure follows the reference in ui-design/ (hero → features → how it
 * works → call to action → footer) but uses KPIMe's own design tokens: Poppins,
 * the deep purple (#21005D) and the amber accent from the app shell.
 */

const FEATURES = [
  {
    icon: "completed" as const,
    title: "One list for today",
    text: "Add a task with a start and end time, tick it off, and switch between everything, completed and in progress in one click.",
  },
  {
    icon: "clock" as const,
    title: "Reminders that fit your day",
    text: "KPIMe watches the clock for you: overdue tasks, tasks starting within your lead time and everything else coming up later today.",
  },
  {
    icon: "bell" as const,
    title: "Browser and email alerts",
    text: "A desktop notification while KPIMe is open, and an email digest when you are away. Choose either, or both, in Settings.",
  },
  {
    icon: "team" as const,
    title: "Work as a team",
    text: "Create an organization, add members by email and see every task the team is working on from one read-only view.",
  },
];

const STEPS = [
  {
    title: "Create your account",
    text: "Sign up with your email, or continue with Google, then pick a personal or an organization account.",
  },
  {
    title: "Plan your day",
    text: "Press Add Todo, give the task a title and a time range. It lands straight in your list.",
  },
  {
    title: "Let KPIMe remind you",
    text: "Choose your lead time in Settings and get notified before a task starts, when it is late, and what is next.",
  },
];

function HeroTask({
  title,
  time,
  state,
}: {
  title: string;
  time: string;
  state: "done" | "open";
}) {
  return (
    <div className="landing-todo">
      <span
        className={`landing-todo-check${state === "done" ? " is-done" : ""}`}
        aria-hidden="true"
      >
        {state === "done" ? <Icon name="completed" strokeWidth={2.6} /> : null}
      </span>
      <span className="landing-todo-title">{title}</span>
      <span className="landing-todo-time">
        <Icon name="clock" />
        <span>{time}</span>
      </span>
    </div>
  );
}

export function LandingPage() {
  return (
    <div className="landing">
      <header className="landing-nav">
        <Link className="landing-logo" href="/">
          KPIMe
        </Link>

        <nav className="landing-links" aria-label="Site">
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
          <a href="#alerts">Notifications</a>
        </nav>

        <div className="landing-nav-actions">
          <Link className="landing-signin" href="/login">
            Sign in
          </Link>
          <Link className="btn-primary btn-small" href="/register">
            Create account
          </Link>
        </div>
      </header>

      <main>
        <section className="landing-hero">
          <div className="landing-hero-copy">
            <span className="landing-eyebrow">Tasks · reminders · team</span>
            <h1>Get more done with KPIMe</h1>
            <p className="landing-lead">
              KPIMe keeps your day in one place: plan tasks with times, get
              reminded before they start or when they are late, and share the
              picture with your team.
            </p>

            <div className="landing-hero-actions">
              <Link className="btn-primary" href="/register">
                Create your account
              </Link>
              <Link className="btn-ghost" href="/login">
                Sign in
              </Link>
            </div>

            <p className="landing-note">
              Free to use · works in your browser · no credit card
            </p>
          </div>

          <div className="landing-hero-visual" aria-hidden="true">
            <div className="landing-mock">
              <div className="landing-mock-bar">
                <span className="landing-mock-dot" />
                <span className="landing-mock-search">search for task …</span>
                <span className="landing-mock-bell">
                  <Icon name="bell" />
                </span>
              </div>

              <div className="landing-mock-body">
                <p className="landing-mock-greeting">Good morning Abel!</p>
                <p className="landing-mock-date">Today, Wednesday 26 October, 2026</p>

                <div className="landing-mock-list">
                  <HeroTask title="Jogging" time="10:30AM - 2:00PM" state="done" />
                  <HeroTask title="Team standup" time="9:00AM - 9:30AM" state="open" />
                  <HeroTask title="Ship the landing page" time="3:00PM - 5:00PM" state="open" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-section" id="features">
          <header className="landing-section-head">
            <h2>Everything you need to run your day</h2>
            <p>No setup, no clutter — open KPIMe and know what is next.</p>
          </header>

          <div className="landing-grid">
            {FEATURES.map((feature) => (
              <article className="landing-card" key={feature.title}>
                <span className="landing-card-icon">
                  <Icon name={feature.icon} />
                </span>
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-section landing-section--tint" id="how">
          <header className="landing-section-head">
            <h2>How it works</h2>
            <p>Three steps and your day is planned.</p>
          </header>

          <ol className="landing-steps">
            {STEPS.map((step, index) => (
              <li key={step.title}>
                <span className="landing-step-num">{index + 1}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="landing-section" id="alerts">
          <div className="landing-alerts">
            <div className="landing-alerts-copy">
              <span className="landing-eyebrow">Never miss a deadline</span>
              <h2>Reminders where you already are</h2>
              <p>
                Tasks in KPIMe are planned for today, so the app derives
                notifications from the clock instead of a pile of settings:
                overdue, starting soon, and coming up later today.
              </p>
              <ul className="landing-checks">
                <li>
                  <Icon name="completed" strokeWidth={2.6} /> Desktop alerts
                  while KPIMe is open
                </li>
                <li>
                  <Icon name="completed" strokeWidth={2.6} /> An email digest
                  when you are away
                </li>
                <li>
                  <Icon name="completed" strokeWidth={2.6} /> A lead time you
                  choose: 5 to 120 minutes
                </li>
              </ul>
              <Link className="btn-ghost" href="/register">
                Turn on reminders
              </Link>
            </div>

            <div className="landing-alerts-visual" aria-hidden="true">
              <div className="landing-alert">
                <span className="landing-alert-dot landing-alert-dot--overdue" />
                <div>
                  <strong>Overdue task</strong>
                  <span>Jogging — was due at 2:00PM</span>
                </div>
              </div>
              <div className="landing-alert">
                <span className="landing-alert-dot landing-alert-dot--reminder" />
                <div>
                  <strong>Starting soon</strong>
                  <span>Team standup — starts in 15 minutes</span>
                </div>
              </div>
              <div className="landing-alert">
                <span className="landing-alert-dot landing-alert-dot--upcoming" />
                <div>
                  <strong>Coming up today</strong>
                  <span>Ship the landing page — 3:00PM</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-cta">
          <h2>Ready to plan your day?</h2>
          <p>Create your free account and add your first task in a minute.</p>
          <div className="landing-hero-actions">
            <Link className="landing-cta-primary" href="/register">
              Create your account
            </Link>
            <Link className="landing-cta-secondary" href="/login">
              Sign in
            </Link>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-footer-brand">
          <span className="landing-logo">KPIMe</span>
          <p>Tasks, reminders and your team in one place.</p>
        </div>

        <nav aria-label="Footer">
          <Link href="/login">Sign in</Link>
          <Link href="/register">Create account</Link>
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
        </nav>

        <p className="landing-footer-note">© {new Date().getFullYear()} KPIMe</p>
      </footer>
    </div>
  );
}
