// A deliberate, described slot for a photograph the owner will supply.
// It is meant to look authored rather than broken, so the page still reads
// as finished while the real image is missing.
export default function Placeholder ({ ratio = '16 / 9', title, brief, credit }) {
  return (
    <figure className="ph" style={{ aspectRatio: ratio }}>
      <div className="ph-grain" aria-hidden="true" />
      <div className="ph-body">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="2.6" y="4.6" width="18.8" height="14.8" rx="2.6" stroke="currentColor" strokeWidth="1.4"/>
          <circle cx="12" cy="12.4" r="3.6" stroke="currentColor" strokeWidth="1.4"/>
          <path d="M8.2 4.6l1.3-2h5l1.3 2" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
        </svg>
        <p className="ph-title">{title}</p>
        <p className="ph-brief">{brief}</p>
        {credit && <p className="ph-credit">{credit}</p>}
      </div>
    </figure>
  )
}
