import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { Home } from '@/views/Home'
import { BandView } from '@/views/BandView'
import { AlbumView } from '@/views/AlbumView'
import { SongView } from '@/views/SongView'
import { SongEditView } from '@/views/SongEditView'

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Home />} />
        <Route path="/:bandSlug" element={<BandView />} />
        <Route path="/:bandSlug/:albumSlug" element={<AlbumView />} />
        <Route path="/:bandSlug/:albumSlug/:songSlug" element={<SongView />} />
        <Route path="/:bandSlug/:albumSlug/:songSlug/edit" element={<SongEditView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
