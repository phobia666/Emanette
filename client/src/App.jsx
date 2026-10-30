import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Join from './pages/Join.jsx';
import Instructions from './pages/Instructions.jsx';
import Play from './pages/Play.jsx';
import { Home, About, Contact, Login } from './pages/Placeholders.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/login" element={<Login />} />
        <Route path="/join/:code" element={<Join />} />
        <Route path="/instructions/:code" element={<Instructions />} />
        <Route path="/play/:code" element={<Play />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
