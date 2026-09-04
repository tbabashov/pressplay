// The check that sits beside a name.
//
// Drawn rather than shipped as an emoji so it inherits the type it sits next
// to: it takes its size from the text around it and its colour from the class,
// which means one badge works in a heading, a byline and a comment without
// three sizes of asset.
//
// It keeps the site's own gold rather than var(--accent), which drifts to the
// colour of whatever record is playing. A mark that means "this account is who
// it says it is" cannot be a different colour every four minutes.
export default function Verified ({ size = '1em', label = 'Verified account' }) {
  return (
    <svg
      className="vf" width={size} height={size} viewBox="0 0 24 24"
      role="img" aria-label={label}
    >
      {/* No <title>: that draws the browser's own tooltip, which appears on a
          tap as well as a hover and cannot be styled. The label is still on the
          element, so anything reading the page still announces it. */}
      <circle cx="12" cy="12" r="10.5" fill="currentColor" />
      <path
        d="M7.6 12.4 10.6 15.3 16.4 9.2" fill="none" stroke="var(--vf-tick, #0a0a0c)"
        strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  )
}
