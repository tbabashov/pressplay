// Achievements are read, never written. Every one of them is a question asked
// of the reviews, comments and votes already in the store, so there is no
// separate table to keep in step with reality and nothing to backfill: rate an
// album from 1994 today and the decade badge counts it immediately, including
// for everything rated before this file existed.
//
// Each one carries the count it needs, so a badge can show how far along it is
// rather than only whether it is done. A locked badge with 18 of 25 on it is
// worth more than a locked badge with nothing on it.

import { NA } from './rating-scale.js'

const decadeOf = year => {
  const y = Number(year)
  return Number.isFinite(y) && y > 1900 ? Math.floor(y / 10) * 10 : null
}

const songScores = r => Object.values(r.scores ?? {}).filter(v => typeof v === 'number')

// A track list is only "complete" if there was one to complete: an album with
// no track data would otherwise count as fully scored on a technicality.
const fullyScored = r => {
  const tracks = r.album?.tracks?.length ?? 0
  if (!tracks) return false
  const scored = Object.values(r.scores ?? {}).filter(v => v !== null && v !== undefined).length
  return scored >= tracks
}

export const GROUPS = [
  ['listening', 'Listening'],
  ['scoring', 'Scoring'],
  ['range', 'Range'],
  ['company', 'Company']
]

// need is the count the badge is measured against; count reads the library and
// returns how much of it there is.
const CATALOGUE = [
  {
    key: 'first-play', group: 'listening', name: 'First Play',
    about: 'Rate your first album.', need: 1,
    count: d => d.reviews.length
  },
  {
    key: 'regular', group: 'listening', name: 'Regular',
    about: 'Rate ten albums.', need: 10,
    count: d => d.reviews.length
  },
  {
    key: 'century', group: 'listening', name: 'Century',
    about: 'Rate a hundred albums.', need: 100,
    count: d => d.reviews.length
  },
  {
    key: 'archivist', group: 'listening', name: 'Archivist',
    about: 'Rate five hundred albums.', need: 500,
    count: d => d.reviews.length
  },
  {
    key: 'perfect', group: 'scoring', name: 'Perfect',
    about: 'Give a song a ten.', need: 1,
    count: d => d.reviews.filter(r => songScores(r).includes(10)).length
  },
  {
    key: 'majestic', group: 'scoring', name: 'Majestic',
    about: 'Give a song an eleven.', need: 1,
    count: d => d.reviews.filter(r => songScores(r).includes(11)).length
  },
  {
    key: 'no-mercy', group: 'scoring', name: 'No Mercy',
    about: 'Give a song a zero.', need: 1,
    count: d => d.reviews.filter(r => songScores(r).includes(0)).length
  },
  {
    key: 'flawless', group: 'scoring', name: 'Flawless',
    about: 'Rate an album where every song scores nine or more.', need: 1,
    count: d => d.reviews.filter(r => {
      const s = songScores(r)
      return s.length >= 5 && s.every(v => v >= 9)
    }).length
  },
  {
    key: 'skipper', group: 'scoring', name: 'Call It A Skit',
    about: 'Mark twenty five tracks as not applicable.', need: 25,
    count: d => d.reviews.reduce(
      (n, r) => n + Object.values(r.scores ?? {}).filter(v => v === NA).length, 0)
  },
  {
    key: 'completist', group: 'range', name: 'Completist',
    about: 'Score every track on twenty five albums.', need: 25,
    count: d => d.reviews.filter(fullyScored).length
  },
  {
    key: 'time-traveller', group: 'range', name: 'Time Traveller',
    about: 'Rate albums from four different decades.', need: 4,
    count: d => new Set(d.reviews.map(r => decadeOf(r.year)).filter(Boolean)).size
  },
  {
    key: 'wide-net', group: 'range', name: 'Wide Net',
    about: 'Rate twenty five different artists.', need: 25,
    count: d => new Set(d.reviews.map(r => (r.artist || '').toLowerCase()).filter(Boolean)).size
  },
  {
    key: 'on-the-record', group: 'company', name: 'On The Record',
    about: 'Publish ten ratings.', need: 10,
    count: d => d.reviews.filter(r => r.published).length
  },
  {
    key: 'talker', group: 'company', name: 'Talker',
    about: 'Leave twenty five replies.', need: 25,
    count: d => d.commentsWritten
  },
  {
    key: 'agreed-with', group: 'company', name: 'Agreed With',
    about: 'Collect twenty five upvotes.', need: 25,
    count: d => d.upvotes
  },
  {
    key: 'followed', group: 'company', name: 'Followed',
    about: 'Be followed by ten people.', need: 10,
    count: d => d.followers
  }
]

// The whole board, earned and not. Sorting puts what is finished first and then
// what is closest, so the next one to go for is at the front of the locked half
// rather than buried by alphabet.
export function achievementsFor (data) {
  const d = {
    reviews: data.reviews ?? [],
    commentsWritten: data.commentsWritten ?? 0,
    upvotes: data.upvotes ?? 0,
    followers: data.followers ?? 0
  }

  return CATALOGUE.map(a => {
    const have = Math.max(0, a.count(d))
    return {
      key: a.key,
      group: a.group,
      name: a.name,
      about: a.about,
      need: a.need,
      have: Math.min(have, a.need),
      earned: have >= a.need,
      // Rounded down, so nothing reads as finished until it is.
      percent: Math.min(100, Math.floor((have / a.need) * 100))
    }
  }).sort((a, b) =>
    (Number(b.earned) - Number(a.earned)) || (b.percent - a.percent) || a.name.localeCompare(b.name))
}

export const earnedCount = list => list.filter(a => a.earned).length
