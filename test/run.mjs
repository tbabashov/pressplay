// A test runner in one file, run with `npm test`. No framework: the point is
// that it starts instantly and has no dependency that can rot, so there is
// never a reason not to run it.
//
// What it covers is chosen from what has actually broken here rather than from
// what is easy to assert: pure logic in lib, and the data files, which is
// where a wrong number stays invisible until someone plays it.
import { results } from './harness.mjs'

await import('./lib.mjs')
await import('./data.mjs')

console.log(`\n  ${results.pass} passing`)
if (results.fails.length) {
  console.log(`  ${results.fails.length} failing\n`)
  for (const [n, m] of results.fails) console.log(`  x ${n}\n      ${m}`)
  process.exit(1)
}
console.log('')
