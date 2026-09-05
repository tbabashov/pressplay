import { driver } from '@/lib/db'
import { billingReport } from '@/lib/billing'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// A server exception on Vercel reaches the browser as a digest and nothing
// else, so the actual cause is invisible from outside. This says which store is
// in use, whether it answers, and which configuration is present. It reports
// names and presence only: no value of any secret is returned.
export async function GET () {
  const started = Date.now()
  const report = {
    ok: true,
    store: driver(),
    serverless: Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME),
    env: Object.fromEntries(
      ['DATABASE_URL', 'AUTH_SECRET', 'AUTH_GOOGLE_ID', 'AUTH_GOOGLE_SECRET',
       'ADMIN_EMAIL', 'SUPABASE_SERVICE_ROLE_KEY',
       // Without these the password reset answers "a link is on its way" and
       // sends nothing, which is indistinguishable from a lost mail.
       'RESEND_API_KEY', 'MAIL_FROM']
        .map(k => [k, process.env[k] ? 'set' : 'MISSING'])
    ),
    // Which half of billing is configured. Selling needs the key, the store and
    // the variant being sold; taking webhooks needs only the secret, so a build
    // can be able to do one and not the other, and this says which.
    billing: billingReport(),
    checks: {}
  }

  // A file store on a read-only filesystem is the failure that looks like
  // nothing: every page that touches data throws, and pages that do not carry
  // on working, so it presents as an intermittent fault rather than a
  // misconfiguration.
  if (report.store === 'file' && report.serverless) {
    report.ok = false
    report.checks.store = 'FATAL: the JSON file store cannot work on a serverless host. ' +
      'Its filesystem is read only, so every read and write throws. Set DATABASE_URL.'
  }

  try {
    const { listProfiles } = await import('@/lib/db')
    const profiles = await listProfiles()
    report.checks.database = `ok, ${profiles.length} profile${profiles.length === 1 ? '' : 's'}`
  } catch (e) {
    report.ok = false
    report.checks.database = `FAILED: ${e.message}`
  }

  report.ms = Date.now() - started
  return Response.json(report, { status: report.ok ? 200 : 503 })
}
