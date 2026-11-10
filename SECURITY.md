# Security Policy

## Supported versions

| Version | Supported |
|---------|-----------|
| 2.x     | Yes       |
| < 2.0   | No        |

## Reporting a vulnerability

Please report security issues privately to **security@scrummaster.app** (or
open a GitHub Security Advisory). Do not file public issues for
vulnerabilities.

Include:
- A description of the issue and its impact
- Steps to reproduce
- Affected versions

We aim to acknowledge within 72 hours and provide a fix or mitigation within
30 days for critical issues.

## Scope

In scope: the web app, the desktop app, the encryption scheme, and the
Supabase integration. Out of scope: third-party dependencies (report those
upstream).

## Note on the desktop build

The desktop installer ships a Supabase service-role key for offline admin
operations. Treat any extracted key as compromised and rotate it if you
suspect misuse. A row-level-security-based build (no shipped key) is on the
roadmap.
