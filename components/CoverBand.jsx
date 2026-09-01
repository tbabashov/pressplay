// The same composition the sign in page uses, turned on its side: real covers,
// rotated off true, veiled so type sits on top of them. Principle three says
// real covers only, never stock, and there are ninety of them to hand.
export default function CoverBand ({ albums, heading, sub, count = 18 }) {
  const covers = albums.slice(0, count)

  return (
    <div className="cb">
      <div className="cb-grid" aria-hidden="true">
        {covers.map(a => (
          <img key={a.cover} src={a.cover} alt="" loading="lazy" width="200" height="200" />
        ))}
      </div>
      <div className="cb-veil" aria-hidden="true" />
      <div className="cb-copy shell">
        <h2 className="display h2">{heading}</h2>
        {sub && <p className="lede measure">{sub}</p>}
      </div>
    </div>
  )
}
