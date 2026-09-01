// The product's mark: a condenser mic inside a pair of headphones, drawn from
// the same path everywhere it appears so the tab, the nav, the app shell and
// the exported credit cannot drift apart. A circle with a play triangle in it
// is the most common logo on the internet, which is the one thing a mark
// cannot afford to be.
export default function Mark ({ size = 18, className }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      className={className} aria-hidden="true"
      fill="none" stroke="currentColor"
      strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"
    >
      {/* headband */}
      <path d="M4.4 14.2v-2.6a7.6 7.6 0 0 1 15.2 0v2.6" />
      {/* earcups */}
      <rect x="2.4" y="13.4" width="4" height="6.6" rx="1.9" />
      <rect x="17.6" y="13.4" width="4" height="6.6" rx="1.9" />
      {/* the capsule, and the stand it sits on */}
      <rect x="9.5" y="5.6" width="5" height="9.4" rx="2.5" />
      <path d="M12 15v3.2M9.6 18.4h4.8" />
    </svg>
  )
}
