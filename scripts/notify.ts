/**
 * Send the notification email digest.
 *
 *   npm run notify
 *   npm run notify -- --dry-run
 *   npm run notify -- --user=<profile-id-or-email>
 *
 * Schedule it every 10 minutes from cron / Task Scheduler. A notification is
 * emailed at most once (notification_state).
 */

import { runDigest } from "../src/lib/notify";

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log("Usage: npm run notify -- [--user=ID|EMAIL] [--dry-run]");
    return;
  }

  const userArg = args.find((arg) => arg.startsWith("--user="));
  const dryRun = args.includes("--dry-run");

  const result = await runDigest({
    user: userArg?.slice("--user=".length) || undefined,
    dryRun,
  });

  for (const line of result.lines) {
    console.log(line);
  }

  console.log("");
  console.log(
    `Done: ${result.sent} sent, ${result.skipped} skipped, ${result.failed} failed (${result.transport} transport).`,
  );

  process.exitCode = result.failed > 0 ? 1 : 0;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
