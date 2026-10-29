import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Join from './pages/Join.jsx';
import Play from './pages/Play.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/join/:code" element={<Join />} />
        <Route path="/play/:code" element={<Play />} />
        <Route path="*" element={<p className="p-6">Scan the QR code to join a quiz.</p>} />
      </Routes>
    </BrowserRouter>
  );
}