// Production store. Works with any Postgres that gives a connection string
// (Neon, Supabase, Railway, RDS). Driver is imported lazily so a file-backed
// install never pays for it.
let pool = null

async function getPool () {
  if (pool) return pool
  const { Pool } = await import('pg')
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
    max: 5
  })
  return pool
}

export async function init () {
  const p = await getPool()
  await p.query(`
    create table if not exists reviews (
      id           text primary key,
      user_email   text not null,
      album_id     text not null,
      album_name   text,
      artist       text,
      cover        text,
      year         text,
      scores       jsonb not null default '{}'::jsonb,
      criteria     jsonb not null default '{}'::jsonb,
      final_override text,
      final        numeric,
      published    boolean not null default false,
      created_at   timestamptz not null default now(),
      updated_at   timestamptz not null default now()
    );
    create index if not exists reviews_user_updated on reviews (user_email, updated_at desc);
    create index if not exists reviews_user_created on reviews (user_email, created_at);
    -- added after the first release, so existing tables get them too
    alter table reviews add column if not exists selections jsonb not null default '{}'::jsonb;
    alter table reviews add column if not exists now_playing text;
    -- Self-contained album snapshot: lets a review survive the catalogue
    -- delisting it, and carries imported records that were never in it.
    alter table reviews add column if not exists album jsonb;
    alter table reviews add column if not exists artist_images jsonb not null default '[]'::jsonb;

    -- A public identity per account. The handle is what appears in a URL, so it
    -- is unique case-insensitively: two raters cannot differ by capitals alone.
    create table if not exists users (
      email      text primary key,
      handle     text not null,
      name       text,
      image      text,
      bio        text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
    create unique index if not exists users_handle on users (lower(handle));

    -- Comments hang off a review by its composite id, not off an album, so two
    -- people rating the same record keep separate threads.
    create table if not exists comments (
      id           text primary key,
      review_id    text not null,
      author_email text not null,
      body         text not null,
      created_at   timestamptz not null default now()
    );
    create index if not exists comments_review on comments (review_id, created_at);

    create table if not exists follows (
      follower_email text not null,
      target_email   text not null,
      created_at     timestamptz not null default now(),
      primary key (follower_email, target_email)
    );
    create index if not exists follows_target on follows (target_email);
  `)
}

const id = (email, albumId) => `${email}::${albumId}`

const shape = r => r && ({
  userEmail: r.user_email,
  albumId: r.album_id,
  albumName: r.album_name,
  artist: r.artist,
  cover: r.cover,
  year: r.year,
  scores: r.scores,
  criteria: r.criteria,
  selections: r.selections ?? {},
  album: r.album ?? null,
  artistImages: r.artist_images ?? [],
  nowPlaying: r.now_playing ?? null,
  finalOverride: r.final_override,
  final: r.final === null ? null : Number(r.final),
  published: r.published,
  createdAt: r.created_at?.toISOString?.() ?? r.created_at,
  updatedAt: r.updated_at?.toISOString?.() ?? r.updated_at
})

export async function getReview (email, albumId) {
  const p = await getPool()
  const { rows } = await p.query('select * from reviews where id = $1', [id(email, albumId)])
  return shape(rows[0]) || null
}

export async function saveReview (r) {
  const p = await getPool()
  const { rows } = await p.query(`
    insert into reviews (id, user_email, album_id, album_name, artist, cover, year,
                         scores, criteria, final_override, final, published,
                         selections, now_playing, album, artist_images, created_at, updated_at)
    values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,
            coalesce($17::timestamptz, now()), coalesce($18::timestamptz, now()))
    on conflict (id) do update set
      album_name = excluded.album_name,
      artist     = excluded.artist,
      cover      = excluded.cover,
      year       = excluded.year,
      scores     = excluded.scores,
      criteria   = excluded.criteria,
      final_override = excluded.final_override,
      final      = excluded.final,
      published  = excluded.published,
      selections = excluded.selections,
      now_playing = excluded.now_playing,
      album      = coalesce(excluded.album, reviews.album),
      artist_images = excluded.artist_images,
      updated_at = now()
    returning *`,
    [id(r.userEmail, r.albumId), r.userEmail, r.albumId, r.albumName, r.artist, r.cover,
     r.year, JSON.stringify(r.scores ?? {}), JSON.stringify(r.criteria ?? {}),
     r.finalOverride ?? null, r.final ?? null, r.published ?? false,
     JSON.stringify(r.selections ?? {}), r.nowPlaying ?? null,
     r.album ? JSON.stringify(r.album) : null,
     JSON.stringify(r.artistImages ?? []),
     r.createdAt ?? null, r.updatedAt ?? null])
  return shape(rows[0])
}

export async function listReviews (email) {
  const p = await getPool()
  const { rows } = await p.query(
    'select * from reviews where user_email = $1 order by updated_at desc', [email])
  return rows.map(shape)
}

export async function deleteReview (email, albumId) {
  const p = await getPool()
  await p.query('delete from reviews where id = $1', [id(email, albumId)])
}

export async function countToday (email) {
  const p = await getPool()
  const { rows } = await p.query(
    `select count(*)::int as n from reviews
      where user_email = $1 and created_at >= date_trunc('day', now())`, [email])
  return rows[0]?.n ?? 0
}

// ---------- Standings snapshots ----------
export async function getSnapshot (email) {
  const p = await getPool()
  await p.query(`create table if not exists snapshots (
    user_email text primary key,
    taken_at timestamptz not null default now(),
    ranks jsonb not null default '{}'::jsonb,
    ratings jsonb not null default '{}'::jsonb
  )`)
  const { rows } = await p.query('select * from snapshots where user_email = $1', [email])
  if (!rows[0]) return null
  return {
    email: rows[0].user_email,
    takenAt: rows[0].taken_at?.toISOString?.() ?? rows[0].taken_at,
    ranks: rows[0].ranks,
    ratings: rows[0].ratings || {}
  }
}

export async function saveSnapshot (email, ranks, ratings) {
  const p = await getPool()
  await getSnapshot(email)   // ensures the table exists
  const { rows } = await p.query(`
    insert into snapshots (user_email, taken_at, ranks, ratings) values ($1, now(), $2, $3)
    on conflict (user_email) do update set
      taken_at = now(), ranks = excluded.ranks, ratings = excluded.ratings
    returning *`, [email, JSON.stringify(ranks), JSON.stringify(ratings || {})])
  return { email, takenAt: rows[0].taken_at?.toISOString?.(), ranks: rows[0].ranks, ratings: rows[0].ratings }
}

export async function clearSnapshot (email) {
  const p = await getPool()
  await p.query('delete from snapshots where user_email = $1', [email])
}

// ---------- Hand-entered discography albums ----------
async function discTable () {
  const p = await getPool()
  await p.query(`create table if not exists discography (
    id text primary key,
    user_email text not null,
    name text not null,
    year text,
    cover text,
    artists jsonb not null default '[]'::jsonb
  );
  create index if not exists discography_user on discography (user_email);`)
  return p
}

export async function listDiscography (email) {
  const p = await discTable()
  const { rows } = await p.query('select * from discography where user_email = $1 order by name', [email])
  return rows.map(r => ({ id: r.id, userEmail: r.user_email, name: r.name, year: r.year, cover: r.cover, artists: r.artists }))
}

export async function saveDiscographyEntry (email, entry) {
  const p = await discTable()
  const id = entry.id || `d${Date.now()}${Math.random().toString(36).slice(2, 7)}`
  const { rows } = await p.query(`
    insert into discography (id, user_email, name, year, cover, artists)
    values ($1,$2,$3,$4,$5,$6)
    on conflict (id) do update set
      name = excluded.name, year = excluded.year,
      cover = excluded.cover, artists = excluded.artists
    returning *`,
    [id, email, entry.name, entry.year || null, entry.cover || null, JSON.stringify(entry.artists || [])])
  const r = rows[0]
  return { id: r.id, userEmail: r.user_email, name: r.name, year: r.year, cover: r.cover, artists: r.artists }
}

export async function deleteDiscographyEntry (email, id) {
  const p = await discTable()
  await p.query('delete from discography where id = $1 and user_email = $2', [id, email])
}

// ---------- Public profiles ----------
const profileShape = u => u && ({
  email: u.email,
  handle: u.handle,
  name: u.name,
  image: u.image,
  bio: u.bio,
  createdAt: u.created_at?.toISOString?.() ?? u.created_at,
  updatedAt: u.updated_at?.toISOString?.() ?? u.updated_at
})

export async function getProfile (email) {
  const p = await getPool()
  const { rows } = await p.query('select * from users where email = $1', [email])
  return profileShape(rows[0]) || null
}

export async function getProfileByHandle (handle) {
  const p = await getPool()
  const { rows } = await p.query('select * from users where lower(handle) = lower($1)', [handle])
  return profileShape(rows[0]) || null
}

export async function listProfiles () {
  const p = await getPool()
  const { rows } = await p.query('select * from users order by created_at')
  return rows.map(profileShape)
}

// Only the columns present in the patch are written, so saving a bio cannot
// blank a name that was not on the form.
export async function upsertProfile (email, patch) {
  const p = await getPool()
  const cols = ['handle', 'name', 'image', 'bio'].filter(c => patch[c] !== undefined)
  const vals = cols.map(c => patch[c])
  const insertCols = ['email', ...cols]
  const placeholders = insertCols.map((_, i) => `$${i + 1}`)
  const updates = cols.map(c => `${c} = excluded.${c}`)
  const { rows } = await p.query(`
    insert into users (${insertCols.join(', ')})
    values (${placeholders.join(', ')})
    on conflict (email) do update set
      ${[...updates, 'updated_at = now()'].join(', ')}
    returning *`, [email, ...vals])
  return profileShape(rows[0])
}

// The unique index decides, not a read followed by a write: two sign-ins racing
// for the same handle would both find it free.
export async function claimHandle (email, handle) {
  const p = await getPool()
  try {
    const { rows } = await p.query(`
      insert into users (email, handle) values ($1, $2)
      on conflict (email) do update set handle = excluded.handle, updated_at = now()
      returning *`, [email, String(handle).toLowerCase()])
    return { ok: true, profile: profileShape(rows[0]) }
  } catch (e) {
    if (e.code === '23505') return { ok: false }   // someone else holds it
    throw e
  }
}

// ---------- Comments ----------
const commentShape = c => c && ({
  id: c.id,
  reviewId: c.review_id,
  authorEmail: c.author_email,
  body: c.body,
  createdAt: c.created_at?.toISOString?.() ?? c.created_at
})

export async function listComments (reviewId) {
  const p = await getPool()
  const { rows } = await p.query(
    'select * from comments where review_id = $1 order by created_at', [reviewId])
  return rows.map(commentShape)
}

export async function addComment (comment) {
  const p = await getPool()
  const id = comment.id || `c${Date.now()}${Math.random().toString(36).slice(2, 7)}`
  const { rows } = await p.query(`
    insert into comments (id, review_id, author_email, body)
    values ($1, $2, $3, $4) returning *`,
    [id, comment.reviewId, comment.authorEmail, comment.body])
  return commentShape(rows[0])
}

export async function getComment (id) {
  const p = await getPool()
  const { rows } = await p.query('select * from comments where id = $1', [id])
  return commentShape(rows[0]) || null
}

export async function deleteComment (id) {
  const p = await getPool()
  await p.query('delete from comments where id = $1', [id])
}

export async function countComments (reviewIds) {
  if (!reviewIds.length) return {}
  const p = await getPool()
  const { rows } = await p.query(
    'select review_id, count(*)::int as n from comments where review_id = any($1) group by review_id',
    [reviewIds])
  return Object.fromEntries(rows.map(r => [r.review_id, r.n]))
}

// ---------- Follows ----------
export async function follow (follower, target) {
  if (follower === target) return
  const p = await getPool()
  await p.query(`insert into follows (follower_email, target_email) values ($1, $2)
                 on conflict do nothing`, [follower, target])
}

export async function unfollow (follower, target) {
  const p = await getPool()
  await p.query('delete from follows where follower_email = $1 and target_email = $2', [follower, target])
}

export async function isFollowing (follower, target) {
  const p = await getPool()
  const { rows } = await p.query(
    'select 1 from follows where follower_email = $1 and target_email = $2', [follower, target])
  return rows.length > 0
}

export async function listFollowing (email) {
  const p = await getPool()
  const { rows } = await p.query(
    'select target_email from follows where follower_email = $1', [email])
  return rows.map(r => r.target_email)
}

export async function listFollowers (email) {
  const p = await getPool()
  const { rows } = await p.query(
    'select follower_email from follows where target_email = $1', [email])
  return rows.map(r => r.follower_email)
}

// ---------- Passwords ----------
// A separate table from users for the same reason the file store uses a
// separate record: nothing that renders a profile should be able to reach a
// password hash by accident.
async function credTable () {
  const p = await getPool()
  await p.query(`create table if not exists credentials (
    email         text primary key,
    password_hash text not null,
    updated_at    timestamptz not null default now()
  )`)
  return p
}

export async function getCredentials (email) {
  const p = await credTable()
  const { rows } = await p.query('select * from credentials where email = $1', [email])
  if (!rows[0]) return null
  return { email: rows[0].email, passwordHash: rows[0].password_hash }
}

export async function setPassword (email, passwordHash) {
  const p = await credTable()
  await p.query(`
    insert into credentials (email, password_hash) values ($1, $2)
    on conflict (email) do update set password_hash = excluded.password_hash, updated_at = now()`,
    [email, passwordHash])
  return { email }
}
