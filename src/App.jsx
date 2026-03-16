/**
 * FieldMedic — App Root
 * Sets up routing, global effects, and connectivity monitoring.
 */

import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useStore } from '@/store'
import { useOfflineMode } from '@/hooks/useOfflineMode'

import HomePage      from '@/pages/HomePage'
import TriagePage    from '@/pages/TriagePage'
import GuidancePage  from '@/pages/GuidancePage'
import ResponderPage from '@/pages/ResponderPage'
import CasePage      from '@/pages/CasePage'
import ToastStack    from '@/components/ToastStack'
import ConnectionBar from '@/components/ConnectionBar'

import '@/styles/global.css'

export default function App() {
  const { probeConnection } = useOfflineMode()
  const setOnline = useStore((s) => s.setOnline)

  // Sync initial connectivity state
  useEffect(() => {
    setOnline(navigator.onLine)
    probeConnection()

    // Re-probe every 30s — catches degraded connections the browser doesn't report
    const interval = setInterval(probeConnection, 30_000)
    return () => clearInterval(interval)
  }, [])

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ConnectionBar />
      <Routes>
        <Route path="/"           element={<HomePage />} />
        <Route path="/triage"     element={<TriagePage />} />
        <Route path="/guidance"   element={<GuidancePage />} />
        <Route path="/responder"  element={<ResponderPage />} />
        <Route path="/case/:caseId" element={<CasePage />} />
        <Route path="*"           element={<Navigate to="/" replace />} />
      </Routes>
      <ToastStack />
    </BrowserRouter>
  )
}
