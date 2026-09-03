import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { test } from './harness.mjs'
import { previewId } from '../lib/preview-source.js'

const root = path.join(import.meta.dirname, '..')
const wall = JSON.parse(fs.readFileSync(path.join(root, 'lib/wall.json'), 'utf8'))

await test('every wall record has the fields the hero reads', async () => {
  for (const a of wall) {
    assert.ok(a.name && a.artist, `${a.name}: name and artist`)
    assert.ok(a.cover?.startsWith('/wall/'), `${a.name}: cover path`)
    assert.ok(a.track, `${a.name}: a track label`)
    // Either catalogue, but exactly one of them. Deezer is a bare number and
    // Apple is an am prefix; a record with neither is a sleeve that does
    // nothing when pressed.
    assert.ok(previewId(a), `${a.name}: needs a dz or an am id`)
    if (a.dz !== undefined) assert.equal(typeof a.dz, 'number', `${a.name}: dz is a number`)
    if (a.am !== undefined) assert.equal(typeof a.am, 'number', `${a.name}: am is a number`)
    assert.ok(!(a.dz && a.am), `${a.name}: one source, not both`)
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
  const suspicious = wall.filter(a => a.dz && String(a.dz).length < 6)
  assert.equal(suspicious.length, 0,
    'suspiciously short ids: ' + suspicious.map(a => `${a.name}=${a.dz}`).join(', '))
})

await test('no two wall records share a preview', async () => {
  const seen = new Map()
  for (const a of wall) {
    // Compared on the resolved id, not on dz. Two Apple records both have an
    // undefined dz, so keying on that made them collide with each other and
    // report that they play "undefined".
    const id = previewId(a)
    assert.ok(!seen.has(id), `${a.name} and ${seen.get(id)} both play ${id}`)
    seen.set(id, a.name)
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
