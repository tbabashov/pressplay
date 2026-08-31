import React from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { hasToken } from './api.js'
import Login from './pages/Login.jsx'
import Search from './pages/Search.jsx'
import Rate from './pages/Rate.jsx'
import Create from './pages/Create.jsx'
import ExportPage from './pages/Export.jsx'
import Discography from './pages/Discography.jsx'
import Update from './pages/Update.jsx'

function Private ({ children }) {
  const loc = useLocation()
  if (!hasToken()) return <Navigate to="/login" state={{ from: loc }} replace />
  return children
}

export default function App () {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Private><Search /></Private>} />
      <Route path="/create" element={<Private><Create /></Private>} />
      <Route path="/rate/:albumId" element={<Private><Rate /></Private>} />
      <Route path="/export/:albumId" element={<Private><ExportPage /></Private>} />
      <Route path="/discography" element={<Private><Discography /></Private>} />
      <Route path="/update" element={<Private><Update /></Private>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
