import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Locations from './pages/Locations';
import BookingFlow from './pages/BookingFlow';
import Ticket from './pages/Ticket';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen flex flex-col bg-[#F7F8F6]">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/locations" element={<Locations />} />
              <Route path="/book/:slug" element={<BookingFlow />} />
              <Route path="/ticket/:bookingRef" element={<Ticket />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}