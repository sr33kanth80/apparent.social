import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Footer } from './components/Footer';
import { EditorialNavbar } from './components/EditorialNavbar';
import { Home } from './pages/Home';
import { OurThesis } from './pages/OurThesis';
import { ForFounders } from './pages/ForFounders';
import { ForVCs } from './pages/ForVCs';
import { HeatMap } from './pages/HeatMap';
import { AboutUs } from './pages/AboutUs';
import { Contact } from './pages/Contact';
import { ProjectDetail } from './pages/ProjectDetail';
import { PublicProfile } from './pages/PublicProfile';
import { Resources } from './pages/Resources';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { CookiePolicy, PrivacyPolicy, TermsOfService } from './pages/Legal';
import { ProtectedDashboardRoute } from './components/ProtectedDashboardRoute';

const ScrollToHash = () => {
  const location = useLocation();

  useEffect(() => {
    if (location.pathname.startsWith('/dashboard/')) {
      return;
    }

    if (!location.hash) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const id = location.hash.slice(1);
    const scrollToTarget = () => {
      const target = document.getElementById(id);

      if (!target) {
        return;
      }

      const top = target.getBoundingClientRect().top + window.scrollY - 96;
      window.scrollTo({ top: Math.max(top, 0), behavior: 'smooth' });
    };
    const timers = [0, 100, 300].map((delay) => window.setTimeout(scrollToTarget, delay));

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [location.pathname, location.hash]);

  return null;
};

function App() {
  return (
    <Router>
      <div className="bg-white min-h-screen">
        <ScrollToHash />
        <Routes>
          <Route
            path="/login"
            element={
              <>
                <EditorialNavbar />
                <Login />
                <Footer />
              </>
            }
          />
          <Route
            path="/dashboard/founder/*"
            element={
              <ProtectedDashboardRoute role="founder">
                {(user) => <Dashboard role="founder" user={user} />}
              </ProtectedDashboardRoute>
            }
          />
          <Route
            path="/dashboard/investor"
            element={
              <ProtectedDashboardRoute role="investor">
                {(user) => <Dashboard role="investor" user={user} />}
              </ProtectedDashboardRoute>
            }
          />
          <Route
            path="/"
            element={
              <>
                <Home />
                <Footer />
              </>
            }
          />
          <Route
            path="/our-thesis"
            element={
              <>
                <OurThesis />
                <Footer />
              </>
            }
          />
          <Route
            path="/for-founders"
            element={
              <>
                <EditorialNavbar />
                <ForFounders />
                <Footer />
              </>
            }
          />
          <Route
            path="/for-vcs"
            element={
              <>
                <EditorialNavbar />
                <ForVCs />
                <Footer />
              </>
            }
          />
          <Route
            path="/heat-map"
            element={
              <>
                <EditorialNavbar />
                <HeatMap />
                <Footer />
              </>
            }
          />
          <Route
            path="/about"
            element={
              <>
                <EditorialNavbar />
                <AboutUs />
                <Footer />
              </>
            }
          />
          <Route
            path="/resources"
            element={
              <>
                <EditorialNavbar />
                <Resources />
                <Footer />
              </>
            }
          />
          <Route
            path="/projects/:projectId"
            element={
              <>
                <EditorialNavbar />
                <ProjectDetail />
                <Footer />
              </>
            }
          />
          {/* /@username — canonical public profile URL */}
          <Route
            path="/@:username"
            element={<PublicProfile />}
          />
          {/* Legacy /profile/:profileId — kept for backward compat */}
          <Route
            path="/profile/:profileId"
            element={
              <>
                <EditorialNavbar />
                <PublicProfile />
                <Footer />
              </>
            }
          />
          <Route
            path="/contact"
            element={
              <>
                <EditorialNavbar />
                <Contact />
                <Footer />
              </>
            }
          />
          <Route
            path="/privacy"
            element={
              <>
                <EditorialNavbar />
                <PrivacyPolicy />
                <Footer />
              </>
            }
          />
          <Route
            path="/terms"
            element={
              <>
                <EditorialNavbar />
                <TermsOfService />
                <Footer />
              </>
            }
          />
          <Route
            path="/cookies"
            element={
              <>
                <EditorialNavbar />
                <CookiePolicy />
                <Footer />
              </>
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
