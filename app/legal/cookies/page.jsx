export const metadata = { title: 'Cookies' }

const UPDATED = '2 September 2026'

// Every row here was read off the browser rather than copied from a template.
// Three cookies, all set by the sign-in library, none of them present until
// someone signs in.
const COOKIES = [
  ['authjs.session-token', 'Keeps you signed in, so every page knows which account it is showing.', '30 days'],
  ['authjs.csrf-token', 'Stops a sign-in being submitted from another site on your behalf.', 'Until you close the browser'],
  ['authjs.callback-url', 'Remembers which page to return you to after signing in.', 'Until you close the browser']
]

export default function CookiesPage () {
  return (
    <>
      <h1>Cookies</h1>
      <p className="lg-updated">Last updated {UPDATED}</p>

      <p className="lg-lede">
        Three cookies, all of them for signing in. No advertising, no analytics, nothing that
        follows you to another site. If you never sign in, this site sets no cookies at all.
      </p>

      <h2>The cookies</h2>
      <p>
        All three are set by the sign-in library this site uses, and all three are
        <strong> HttpOnly</strong>, which means the page cannot read them and neither can a
        script running on it. They are marked <code>SameSite=Lax</code>, so they are not sent
        when another site links into this one in a way that could act on your behalf.
      </p>
      <div className="lg-table">
        <table>
          <thead><tr><th>Name</th><th>What it is for</th><th>How long it lasts</th></tr></thead>
          <tbody>
            {COOKIES.map(([name, why, life]) => (
              <tr key={name}><td><code>{name}</code></td><td>{why}</td><td>{life}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        None of these exist before you sign in. Reading the landing page, the public review
        pages, or anything else while signed out sets nothing.
      </p>

      <h2>Storage that is not a cookie</h2>
      <p>
        Two things are kept in your browser rather than sent to the server. Neither leaves your
        device and neither is readable by anyone else.
      </p>
      <ul>
        <li>
          <strong>Your slide settings.</strong> The style, colours, what is included, how songs
          are paged. This is the optional one, and the banner asks about it. Decline and the
          settings reset each time you open the export screen.
        </li>
        <li>
          <strong>Your answer to that banner.</strong> One value saying what you chose. It has to
          be kept in order to honour it, which is why declining cannot switch it off.
        </li>
      </ul>

      <h2>Changing your mind</h2>
      <p>
        Clearing site data for this domain in your browser removes everything above, including
        your answer to the banner, which then appears again. Signing out removes the sign-in
        cookies immediately.
      </p>

      <h2>Other people&apos;s servers</h2>
      <p>
        Album artwork mostly reaches you through this site, which means the service hosting the
        image sees a request from our server and not from you. Some covers are still loaded
        straight from where they live, currently <code>i.discogs.com</code> and{' '}
        <code>cdn-images.dzcdn.net</code>. Those requests carry your IP address and browser
        version to those hosts, the way any image on any page does. They do not set cookies here.
      </p>
      <p>
        If you sign in with Google, Google knows you signed in. That is described in{' '}
        <a href="/legal/privacy">the privacy notice</a>.
      </p>
    </>
  )
}
