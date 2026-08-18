# Security Policy

## Supported versions

| Version | Supported |
|---|---|
| 1.1.x | ✅ |
| ≤ 1.0.9 | ❌ |

Versions at or below 1.0.9 contain defects that cause the library to report
false WCAG compliance. They are not supported — please upgrade. See the
[changelog](./CHANGELOG.md) for details.

## Reporting a vulnerability

Report security issues privately through
[GitHub Security Advisories](https://github.com/cdhawke/accessible-colors/security/advisories/new).

Please do not open a public issue for a security report.

This is a small library maintained by one person; expect an initial response
within a week. If you have not heard back after two weeks, feel free to open a
public issue saying only that you are awaiting a response on a private report —
without details.

## Scope

The package has no runtime dependencies, performs no I/O, and makes no network
requests, so its attack surface is limited to the correctness and resource use
of pure functions. Relevant reports include:

- Input that causes unbounded execution or excessive memory use (for example a
  value that makes an internal search fail to terminate).
- Input that causes a thrown exception rather than a `null` return.
- **Any input that produces a false compliance verdict** — a pair reported as
  meeting a WCAG threshold that does not. This is treated as a security-class
  issue because the library's output is used to make accessibility claims, and
  a wrong `true` can carry legal and regulatory consequences downstream.
