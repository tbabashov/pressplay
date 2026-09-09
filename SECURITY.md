# Security

What is defended, what is deliberately not, and what to do next. Written so that
a decision made once does not have to be rediscovered by reading diffs.

## Secrets

No secret has ever been committed. `.env*.local` is ignored and the whole
history was scanned for key material before this file was written; the only
match was the literal `YOURPASSWORD` in an example line in
`scripts/import-to-postgres.mjs`, which is a help message, not a credential.

There is therefore nothing to purge, and no history rewrite has been done.
Rewriting history to remove a placeholder would break every existing clone for
no gain.

`/api/health` reports which environment variables are **set**, never their
values, and now only to the owner. See below.

## Accounts

Passwords are scrypt with a per-password random salt, N=16384, compared with
`timingSafeEqual`. The cost parameter is stored in the hash string, so it can be
raised later without invalidating anyone's existing password.

Sign-in answers a wrong address and a wrong password identically, and verifies
against an empty hash when the address is unknown so that the two take the same
time. The form is not a way to find out who has an account.

Sessions are JWTs in the cookies next-auth sets by default: httpOnly, sameSite,
and Secure in production. Those defaults are not overridden anywhere, which is
deliberate — they are already right, and the common way to get this wrong is to
set them by hand.

## Rate limits

`lib/rate-limit.js` counts in memory. On a serverless host each instance counts
separately, so the numbers are a floor rather than a guarantee; this is written
up in that file and is a deliberate trade, not an oversight. It stops one script
hammering one endpoint, which is the threat at this size.

Registration, password reset, comments, votes, uploads, checkout and the artwork
proxy were limited from the start. Sign-in was not, and now is: twelve attempts
per address per quarter hour, counted only on `/api/auth/callback/credentials`.

The count is per IP and **not** per IP-and-email on purpose. Keying the email in
would hand an attacker a fresh allowance for each account they tried, which is
exactly the shape of a spraying run.

Sign-out, session and CSRF share that route and are not counted, because the app
calls them on ordinary navigation and throttling them would sign people out for
browsing.

## Data access

Every route that reads or writes someone's data takes the address from the
session, never from the request body, so there is no id to tamper with. Where a
record is named by id — a comment, a review — ownership is checked before the
write. `PATCH /api/profile` builds an explicit patch object field by field
rather than spreading the body, so no column can be set by naming it.

Public responses go through `lib/social-shape.js` and `publicProfile`, whose
stated rule is that no email address leaves them. Pages address people by
handle; the store addresses them by email; those modules are the seam.

Postgres is reached only through parameterised `pg` queries. There is no string
interpolation into SQL anywhere in the tree.

RLS is not enabled and is not applicable. The app connects to Postgres with a
`DATABASE_URL` as the owning role, so row-level policies would not apply to it;
there is no anon-key path from a browser to the database. The Supabase service
key is used for image storage only, from the server, in `lib/storage.js`.

## The artwork proxy

`/api/art/[key]` fetches a cover from another host and returns it same-origin so
a canvas can read its colours without tainting. That makes it the one place
where foreign bytes are served from this origin, and it is locked accordingly:
https only, an anchored hostname allowlist, and — added here — the content type
is checked against a list of image types and rebuilt rather than echoed. An
allowed host answering 200 with an HTML error page would otherwise have that
page served as a document from this origin.

## Headers

Set for every response in `next.config.mjs`: HSTS (two years, subdomains,
preload), `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy:
strict-origin-when-cross-origin`, a `Permissions-Policy` that refuses every
feature this app does not use, and `Cross-Origin-Opener-Policy: same-origin`.
Google sign-in is a full-page redirect rather than a popup, so COOP does not
affect it.

### The CSP is enforced, after a report-only pass

It shipped as `Content-Security-Policy-Report-Only` first and was only switched
after a browser had loaded every public page and every screen of the `/dev`
harness with the console collecting violations.

That pass paid for itself. It found `@vercel/analytics` loading its collector
from `https://va.vercel-scripts.com`, which reading the code did not show —
on Vercel the script is proxied same-origin as `/_vercel/insights/script.js`,
so `'self'` covers it there and the external host only appears on some paths.
Enforcing without that pass would have silently stopped analytics reporting.
The host is now named in `script-src` and `connect-src`.

After the fix, both passes reported zero violations, and the pages were
screenshotted to confirm they render rather than white-screen.

**To go back to report-only,** put `-Report-Only` back on the header key in
`next.config.mjs`. That is the whole switch, in either direction.

One gap worth naming: the signed-in app under `/app` was checked through the
`/dev` harness, which renders those screens without a session, rather than
through a real signed-in session. The harness covers the same components, but
if something in the authenticated shell ever gets blocked, this is the corner
it will have come from.

Two directives are looser than they look and both are reasoned:

- `img-src` allows any `https:`. Covers cannot be an allowlist: a review carries
  whatever cover URL it was rated with, people paste their own image URLs when
  storage is unconfigured, and `html-to-image` builds its canvas from `data:`
  and `blob:` URLs. Images cannot execute.
- `script-src` allows `'unsafe-inline'`, because Next's hydration bootstrap is
  an inline script and a policy without it stops the app from starting.
  Tightening this needs per-request nonces, which needs middleware. That is a
  change worth making on its own rather than smuggling into a header commit,
  and it is the single largest remaining improvement available here.

## Known and accepted

`npm audit` reports two advisories against `postcss`, reached only through the
copy bundled inside Next. They are build-time CSS-processing bugs: exploiting
one requires feeding attacker-controlled CSS or a crafted `sourceMappingURL`
into the build. All CSS here is first-party and committed, and the build runs on
Vercel from this repository, so there is no path by which an attacker supplies
either. The runtime risk to the deployed site is nil.

The fix exists only in Next 16. This app is on Next 15 with React 19 and a beta
of next-auth, and a major-version jump carries a far larger chance of breaking
the site than the advisory carries of harming it. Next is held at the latest
15.x. Revisit when Next 16 is otherwise worth taking.

## Not done

- **Bot protection.** No CAPTCHA or Turnstile. Rate limiting is what stands
  between the sign-up form and a script today. Worth adding if spam ever
  actually arrives; not worth the friction or the third party in the auth path
  before then.
- **A shared rate-limit store.** See the trade above.
- **Nonce-based CSP.** See above.
