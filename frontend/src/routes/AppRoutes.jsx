import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from '../components/Layout'
import ProtectedRoute from '../features/auth/ProtectedRoute'
import Login from '../features/auth/Login'
import Dashboard from '../features/analytics/Dashboard'
import LeadsPage from '../pages/LeadsPage'
import CampaignList from '../features/campaigns/CampaignList'
import LiveCallBoard from '../features/calls/LiveCallBoard'
import CallHistory from '../features/calls/CallHistory'
import ManualDial from '../features/calls/ManualDial'

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="/leads" element={<LeadsPage />} />
          <Route path="/campaigns" element={<CampaignList />} />
          <Route path="/live" element={<LiveCallBoard />} />
          <Route path="/dial" element={<ManualDial />} />
          <Route path="/history" element={<CallHistory />} />
          <Route path="/analytics" element={<Dashboard />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
