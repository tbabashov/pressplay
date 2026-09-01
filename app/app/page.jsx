import { auth } from '@/auth'
import Search from '@/components/app/Search'

export default async function RatePage () {
  // The layout redirects when signed out, but layout and page render in
  // parallel, so this has to stand on its own.
  const session = await auth()
  const first = (session?.user?.name || '').split(' ')[0]

  return (
    <>
      <div className="page-head">
        <h1>{first ? `What are you rating, ${first}?` : 'What are you rating?'}</h1>
      </div>
      <Search />
    </>
  )
}
