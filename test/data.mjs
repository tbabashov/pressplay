import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { test } from './harness.mjs'

const root = path.join(import.meta.dirname, '..')
const wall = JSON.parse(fs.readFileSync(path.join(root, 'lib/wall.json'), 'utf8'))

await test('every wall record has the fields the hero reads', async () => {
  for (const a of wall) {
    assert.ok(a.name && a.artist, `${a.name}: name and artist`)
    assert.ok(a.cover?.startsWith('/wall/'), `${a.name}: cover path`)
    assert.ok(a.track, `${a.name}: a track label`)
    assert.equal(typeof a.dz, 'number', `${a.name}: dz must be a number`)
  }
})

await test('every wall cover file exists', async () => {
  for (const a of wall) {
    const f = path.join(root, 'public', a.cover)
    assert.ok(fs.existsSync(f), `missing file for ${a.name}: ${a.cover}`)
  }
})

await test('wall dz values are track ids, not album ids', async () => {
  // Four records once carried their album id here, so the hero played a
  // completely unrelated song. Album ids on Deezer are short; track ids for
  // anything modern are long. This will not catch every case, but it catches
  // the mistake that was actually made.
  const suspicious = wall.filter(a => String(a.dz).length < 6)
  assert.equal(suspicious.length, 0,
    'suspiciously short ids: ' + suspicious.map(a => `${a.name}=${a.dz}`).join(', '))
})

await test('no two wall records share a preview', async () => {
  const seen = new Map()
  for (const a of wall) {
    assert.ok(!seen.has(a.dz), `${a.name} and ${seen.get(a.dz)} both play ${a.dz}`)
    seen.set(a.dz, a.name)
  }
})

await test('a class used in the app has a rule somewhere', async () => {
  // Clearing dead style blocks once deleted three live rules, and the only
  // symptom was a toast rendering in normal flow at the foot of the page.
  const css = ['globals.css', 'app.css', 'landing.css', 'social.css', 'join.css', 'tiers.css', 'legal.css']
    .map(f => { const p = path.join(root, 'app', f); return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '' })
    .join('\n')
  const mustExist = [
    'ach-toast', 'pp-ed', 'pp-rm', 'disc-off', 'lk-add', 'exp-off', 'tabbar', 'sheet-row',
    'sc-post', 'tw-card', 'cs-col', 'ck-body', 'dz', 'errpage', 'lg-body'
  ]
  const missing = mustExist.filter(c => !css.includes('.' + c))
  assert.equal(missing.length, 0, 'no CSS for: ' + missing.join(', '))
})
