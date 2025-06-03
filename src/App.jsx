import { useState, useEffect } from 'react';
import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Generate from './pages/Generate';
import Consultation from './pages/Consultation';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import CurtainLoading from './components/Loading';
import { GenerateProvider } from './contexts/GenerateContext';
import { ConsultationProvider } from './contexts/ConsultationContext';


function App() {
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {

    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  }, []);

  return (
    <GenerateProvider>
      <ConsultationProvider>
        <Router>
          <>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/generate" element={<Generate />} />
              <Route path="/consultation" element={<Consultation />} />
            </Routes>
            <CurtainLoading
              isLoading={isLoading}
            />
            {/* ToastContainer di semua halaman */}
            <ToastContainer
              position="top-right"
              autoClose={3000}
              hideProgressBar={false}
              newestOnTop={true}
              closeOnClick
              pauseOnFocusLoss={false}
              pauseOnHover={false}
              rtl={false}
              draggable
              theme="colored"
            />
          </>
        </Router>
      </ConsultationProvider>
    </GenerateProvider>
  );
}

export default App;
