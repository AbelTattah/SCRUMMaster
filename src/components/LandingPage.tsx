import Link from "next/link";

import { Icon } from "@/components/icons";

/**
 * The public landing page shown to signed-out visitors at "/".
 *
 * Full-bleed sections in the reference order — hero → stats → features →
 * how it works → teams → notifications → screens → FAQ → call to action →
 * footer — styled with Scrum Master's own design tokens: Poppins, the deep purple
 * (#21005D) and the amber accent from the app shell.
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
    text: "Scrum Master watches the clock for you: overdue tasks, tasks starting within your lead time and everything else coming up later today.",
  },
  {
    icon: "bell" as const,
    title: "Browser and email alerts",
    text: "A desktop notification while Scrum Master is open, and an email digest when you are away. Choose either, or both, in Settings.",
  },
  {
    icon: "team" as const,
    title: "Work as a team",
    text: "Create an organization, add members by email and see every task the team is working on from one read-only view.",
  },
];

const STATS = [
  { value: "5–120 min", label: "Reminder lead time, entirely up to you" },
  { value: "Browser + email", label: "Two channels for every reminder" },
  { value: "3 views", label: "Home, Completed and In Progress" },
  { value: "2 account types", label: "Personal or organization" },
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
    title: "Let Scrum Master remind you",
    text: "Choose your lead time in Settings and get notified before a task starts, when it is late, and what is next.",
  },
];

const FAQS = [
  {
    q: "Do I need to install anything?",
    a: "No. Scrum Master runs in the browser on whatever you already use — phone, tablet or desktop. There is nothing to install and nothing to update.",
  },
  {
    q: "How do reminders work?",
    a: "Your tasks are planned for today, so Scrum Master simply compares them to the clock: overdue, starting soon (within the lead time you choose, 5 to 120 minutes), and coming up later today. You get a browser alert while the app is open and an email digest when you are away.",
  },
  {
    q: "What happens when I miss a task?",
    a: "It stays in the Overdue group on your notifications screen until you finish it, so nothing slips away quietly. You can open the task straight from the notification or mark it read.",
  },
  {
    q: "Can my team use it with me?",
    a: "Yes. Sign up for an organization, add members by everyone's email address, and every task the team plans shows up in one shared view. Owners manage the organization and its members.",
  },
  {
    q: "Is Scrum Master free?",
    a: "Yes. Create an account and start adding tasks — there is no payment step and no credit card.",
  },
  {
    q: "Can I search and filter my tasks?",
    a: "The top bar searches every task by title, and the sidebar jumps between your full list, Completed and In Progress with live counts.",
  },
];

const DEVICES = [
  {
    kind: "phone" as const,
    title: "On your phone",
    text: "A true 1:1 phone layout from 320px up: a bottom tab bar, a floating + button and full-width task rows.",
  },
  {
    kind: "tablet" as const,
    title: "On a tablet",
    text: "The sidebar collapses to a slim icon rail so your list keeps the space, with search and filters one tap away.",
  },
  {
    kind: "desktop" as const,
    title: "On the desktop",
    text: "The full sidebar with live counts, the search bar on top and a comfortable zoomed-out view of the whole day.",
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

function DeviceFrame({ kind }: { kind: "phone" | "tablet" | "desktop" }) {
  return (
    <div className={`landing-device landing-device--${kind}`} aria-hidden="true">
      {kind === "desktop" ? <span className="landing-device-rail" /> : null}
      <span className="landing-device-head" />
      <span className="landing-device-pill" />
      <span className="landing-device-row" />
      <span className="landing-device-row" />
      <span className="landing-device-row is-dim" />
      {kind === "phone" ? <span className="landing-device-tabs" /> : null}
    </div>
  );
}

export function LandingPage() {
  return (
    <div className="landing">
      <header className="landing-nav">
        <Link className="landing-logo" href="/">
          Scrum Master
        </Link>

        <nav className="landing-links" aria-label="Site">
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
          <a href="#teams">For teams</a>
          <a href="#alerts">Notifications</a>
          <a href="#faq">FAQ</a>
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
            <h1>Get more done with Scrum Master</h1>
            <p className="landing-lead">
              Scrum Master keeps your day in one place: plan tasks with times, get
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

        <section className="landing-stats" aria-label="Scrum Master at a glance">
          {STATS.map((stat) => (
            <div className="landing-stat" key={stat.value}>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </section>

        <section className="landing-section" id="features">
          <header className="landing-section-head">
            <h2>Everything you need to run your day</h2>
            <p>No setup, no clutter — open Scrum Master and know what is next.</p>
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

        <section className="landing-section" id="teams">
          <header className="landing-section-head">
            <h2>Solo, or with your team</h2>
            <p>
              Start with your own list today — bring people in the moment you
              need to share the picture.
            </p>
          </header>

          <div className="landing-split">
            <article className="landing-split-card">
              <span className="landing-card-icon">
                <Icon name="user" />
              </span>
              <h3>Personal account</h3>
              <p>
                Your own tasks and reminders. Nothing to configure — add a task,
                pick a time and get on with the day.
              </p>
              <ul className="landing-checks">
                <li>
                  <Icon name="completed" strokeWidth={2.6} /> A private list
                  that is yours alone
                </li>
                <li>
                  <Icon name="completed" strokeWidth={2.6} /> Browser and email
                  reminders
                </li>
                <li>
                  <Icon name="completed" strokeWidth={2.6} /> Search and filters
                  in one click
                </li>
              </ul>
              <Link className="btn-ghost" href="/register">
                Create a personal account
              </Link>
            </article>

            <article className="landing-split-card is-accent">
              <span className="landing-card-icon">
                <Icon name="team" />
              </span>
              <h3>Organization account</h3>
              <p>
                Set up an organization, invite the people you work with by
                email and keep every task in one shared view.
              </p>
              <ul className="landing-checks">
                <li>
                  <Icon name="completed" strokeWidth={2.6} /> Add members by
                  email address
                </li>
                <li>
                  <Icon name="completed" strokeWidth={2.6} /> Every team task
                  in one read-only view
                </li>
                <li>
                  <Icon name="completed" strokeWidth={2.6} /> Owners manage the
                  organization
                </li>
              </ul>
              <Link className="landing-cta-primary" href="/register">
                Set up an organization
              </Link>
            </article>
          </div>
        </section>

        <section className="landing-section landing-section--tint" id="alerts">
          <div className="landing-alerts">
            <div className="landing-alerts-copy">
              <span className="landing-eyebrow">Never miss a deadline</span>
              <h2>Reminders where you already are</h2>
              <p>
                Tasks in Scrum Master are planned for today, so the app derives
                notifications from the clock instead of a pile of settings:
                overdue, starting soon, and coming up later today.
              </p>
              <ul className="landing-checks">
                <li>
                  <Icon name="completed" strokeWidth={2.6} /> Desktop alerts
                  while Scrum Master is open
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

        <section className="landing-section" id="screens">
          <header className="landing-section-head">
            <h2>At home on every screen</h2>
            <p>
              Scrum Master reshapes itself for the device in front of you — the same
              tasks, laid out the way that screen wants them.
            </p>
          </header>

          <div className="landing-devices">
            {DEVICES.map((device) => (
              <article className="landing-device-card" key={device.kind}>
                <DeviceFrame kind={device.kind} />
                <div>
                  <h3>{device.title}</h3>
                  <p>{device.text}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-section landing-section--tint" id="faq">
          <header className="landing-section-head">
            <h2>Questions, answered</h2>
            <p>The things people usually want to know before signing up.</p>
          </header>

          <div className="landing-faq">
            {FAQS.map((item) => (
              <details className="landing-faq-item" key={item.q}>
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
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
          <span className="landing-logo">Scrum Master</span>
          <p>Tasks, reminders and your team in one place.</p>
        </div>

        <nav aria-label="Footer">
          <Link href="/login">Sign in</Link>
          <Link href="/register">Create account</Link>
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
          <a href="#teams">For teams</a>
          <a href="#alerts">Notifications</a>
          <a href="#faq">FAQ</a>
        </nav>

        <p className="landing-footer-note">© {new Date().getFullYear()} Scrum Master</p>
      </footer>
    </div>
  );
}
