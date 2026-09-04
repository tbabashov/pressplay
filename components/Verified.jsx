// The check that sits beside a name.
//
// Drawn rather than shipped as an emoji so it inherits the type it sits next
// to: it takes its size from the text around it and its colour from the class,
// which means one badge works in a heading, a byline and a comment.
//
// It keeps the site's own gold rather than var(--accent), which drifts to the
// colour of whatever record is playing. A mark that means "this account is who
// it says it is" cannot be a different colour every four minutes.
//
// The tooltip is the site's own rather than the browser's <title>: that one
// cannot be styled, waits a second before it appears, and on a phone arrives on
// a tap with no way to dismiss it. This one is a span, so it can be shown on
// hover and on focus — which is what a tap gives it — and it can look like the
// rest of the site.
export default function Verified ({ size = '1em', label = 'Verified account' }) {
  return (
    <span className="vf-wrap" tabIndex={0} role="img" aria-label={label}>
      <svg className="vf" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="10.5" fill="currentColor" />
        <path
          d="M7.6 12.4 10.6 15.3 16.4 9.2" fill="none" stroke="var(--vf-tick, #0a0a0c)"
          strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
        />
      </svg>
      {/* Hidden from readers: the wrapper's label already says this, and twice
          is worse than once. */}
      <span className="vf-tip" aria-hidden="true">Verified</span>
    </span>
  )
}
