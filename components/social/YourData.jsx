// Taking a copy, kept apart from the danger zone below it. Both are about your
// data, but one of them is not a destruction and should not sit in a red box
// asking you to type your own name.
//
// A plain link rather than a button with a fetch in it: the route answers with
// a content-disposition header, so the browser saves the file itself. Nothing
// to hold in memory, and it works with the keyboard and a right click like any
// other download on the web.
export default function YourData () {
  return (
    <section className="yd">
      <div className="yd-say">
        <strong>Take a copy of everything</strong>
        <p>
          Every rating, every score you gave a song, your criteria and the scale each album was
          rated on, your discographies and your frozen standings. One JSON file, downloaded now
          rather than requested by email.
        </p>
      </div>
      <a className="yd-go" href="/api/account/export" download>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3.5v11m0 0 4-4m-4 4-4-4M4.5 17.5v2a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1v-2"
            fill="none" stroke="currentColor" strokeWidth="1.9"
            strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Download my data
      </a>
    </section>
  )
}
