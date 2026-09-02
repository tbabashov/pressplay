export const metadata = { title: 'Privacy' }

const UPDATED = '2 September 2026'

export default function PrivacyPage () {
  return (
    <>
      <h1>Privacy</h1>
      <p className="lg-updated">Last updated {UPDATED}</p>

      <p className="lg-lede">
        What this site knows about you, why, and what happens to it. Short, because there is not
        much of it: there is no advertising, no analytics, and nothing is sold or shared for
        marketing.
      </p>

      <h2>What is collected</h2>

      <h3>When you make an account</h3>
      <ul>
        <li>Your email address. It is the account, so it cannot be avoided.</li>
        <li>
          A password, kept only as a scrypt hash with a random salt. The password itself is never
          stored and cannot be recovered from what is.
        </li>
        <li>
          If you sign in with Google instead, Google tells this site your email address, your
          name and your profile picture. Nothing else.
        </li>
      </ul>

      <h3>What you type in</h3>
      <ul>
        <li>Your handle, display name, biography and profile picture.</li>
        <li>
          Your ratings: the score for every track, the criteria you weighed, your best and worst
          picks, any note you attached, and which records you published.
        </li>
        <li>Your comments and votes on other people&apos;s ratings, and who you follow.</li>
        <li>Anything you upload: artist cut-outs, custom covers, slide backgrounds.</li>
      </ul>

      <h3>What is worked out rather than asked for</h3>
      <ul>
        <li>How many records you turned into slides today, so the daily limit can be counted.</li>
        <li>
          Which achievements you have earned. These are counted from your ratings when a page
          asks; nothing extra is recorded about you to produce them.
        </li>
      </ul>

      <h2>What is not collected</h2>
      <ul>
        <li>No analytics. No page-view counter, no session recorder, no heat maps.</li>
        <li>No advertising identifiers, and no cookies that follow you to another site.</li>
        <li>No location beyond whatever a server log holds about an IP address.</li>
        <li>Payment details. Nothing takes a payment yet, and no card is ever typed into this site.</li>
      </ul>

      <h2>What other people can see</h2>
      <p>
        A rating is private until you publish it. Publishing puts it on your public page, in the
        social feed, and in search results if a search engine finds it. Your handle, display
        name, picture and biography are public whenever your profile is.
      </p>
      <p>
        <strong>Your email address is never shown to anyone.</strong> The public side of this site
        addresses people by handle, and the code that shapes public data is written so that
        nothing carrying an address can leave it.
      </p>

      <h2>Who else touches it</h2>
      <ul>
        <li><strong>Vercel</strong> hosts the site and keeps ordinary server logs.</li>
        <li><strong>Supabase</strong> hosts the database, in a data centre in Mumbai, India.</li>
        <li>
          <strong>Deezer</strong> provides the catalogue. Those requests are made by the server,
          so Deezer sees the server rather than you.
        </li>
        <li>
          <strong>Discogs and Deezer&apos;s image servers</strong> serve some album covers directly
          to your browser, which means they see your IP address and browser version for those
          images. Most covers come through this site instead.
        </li>
        <li><strong>Google</strong>, only if you choose to sign in with it.</li>
      </ul>
      <p>Nobody in that list is paid to profile you, and none of them are given your ratings.</p>

      <h2>How long it is kept</h2>
      <p>
        Your account and everything in it stays until you delete it. Delete a review and it goes.
        Ask for the account to be deleted and everything above goes with it, including published
        reviews and comments. Backups roll off on their own within thirty days.
      </p>

      <h2>What you can ask for</h2>
      <p>
        A copy of everything held about you, a correction, or deletion. Write to{' '}
        <a href="mailto:medicalbruh@gmail.com">medicalbruh@gmail.com</a> and it will be answered
        within thirty days. If you are in the UK or EU you can also complain to your data
        protection regulator; in the UK that is the Information Commissioner&apos;s Office.
      </p>

      <h2>Children</h2>
      <p>
        This site is not for anyone under 13. If an account turns out to belong to a child under
        13 it will be deleted along with everything in it.
      </p>

      <h2>Changes</h2>
      <p>
        If this notice changes in a way that affects what is collected or who sees it, the date at
        the top changes and the change is announced in the app before it takes effect.
      </p>
    </>
  )
}
