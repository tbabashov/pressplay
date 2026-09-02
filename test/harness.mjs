// The harness lives apart from the runner so the test files can import it
// without importing the thing that imports them.
export const results = { pass: 0, fails: [] }

export async function test (name, fn) {
  try { await fn(); results.pass++ }
  catch (e) { results.fails.push([name, e.message]) }
}
