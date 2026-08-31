import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, setToken } from '../api.js'

export default function Login () {
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const nav = useNavigate()

  async function submit (e) {
    e.preventDefault()
    setErr('')
    try {
      const { token } = await api.login(pw)
      setToken(token)
      nav('/')
    } catch (e) {
      setErr(e.message)
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-card card" onSubmit={submit}>
        <h1>Album Rankings</h1>
        <p>Enter your password to continue</p>
        <input
          type="password" value={pw} autoFocus
          placeholder="Password"
          onChange={e => setPw(e.target.value)}
        />
        <button type="submit">Sign In</button>
        {err && <div className="err">{err}</div>}
      </form>
    </div>
  )
}
