import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { EditorialNavbar } from './components/editorial/EditorialNavbar';
import { EditorialFooter } from './components/editorial/EditorialFooter';
import { Home } from './pages/Home';
import { OurThesis } from './pages/OurThesis';
import { ForFounders } from './pages/ForFounders';
import { ForVCs } from './pages/ForVCs';
import { HeatMap } from './pages/HeatMap';
import { AboutUs } from './pages/AboutUs';
import { Blog, BlogPost } from './pages/Blog';
import { Contact } from './pages/Contact';
import { ProjectDetail } from './pages/ProjectDetail';
import { SourcedDetail } from './pages/SourcedDetail';
import { PublicProfile } from './pages/PublicProfile';
import { PublicPageShell } from './components/PublicPageShell';
import { Resources } from './pages/Resources';
import { ClaimProfile } from './pages/ClaimProfile';
import { ClaimBuild } from './pages/ClaimBuild';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { CookiePolicy, PrivacyPolicy, TermsOfService } from './pages/Legal';
import { ProtectedDashboardRoute } from './components/ProtectedDashboardRoute';
import NotFound4042 from './components/4042';

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
          <Route path="/login" element={<Login />} />
          <Route
            path="/dashboard/founder/*"
            element={
              <ProtectedDashboardRoute role="founder">
                {(user) => <Dashboard role="founder" user={user} />}
              </ProtectedDashboardRoute>
            }
          />
          <Route
            path="/dashboard/investor/*"
            element={
              <ProtectedDashboardRoute role="investor">
                {(user) => <Dashboard role="investor" user={user} />}
              </ProtectedDashboardRoute>
            }
          />
          <Route
            path="/"
            element={
              <Home />
            }
          />
          <Route path="/our-thesis" element={<OurThesis />} />
          <Route path="/for-founders" element={<ForFounders />} />
          <Route path="/for-vcs" element={<ForVCs />} />
          <Route path="/claim/:signalId" element={<ClaimProfile />} />
          <Route path="/claim-build" element={<ClaimBuild />} />
          <Route
            path="/heat-map"
            element={
              <div className="ed-page ed-page-no-grid flex h-screen flex-col overflow-hidden">
                <EditorialNavbar />
                <HeatMap includeVCContacts vcOnly fullBleed fillParent lockContacts />
              </div>
            }
          />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/resources" element={<Resources />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route
            path="/projects/:projectId"
            element={
              <PublicPageShell>
                <ProjectDetail />
              </PublicPageShell>
            }
          />
          <Route
            path="/sourced/:signalId"
            element={
              <PublicPageShell>
                <SourcedDetail />
              </PublicPageShell>
            }
          />
          {/* /@username — canonical public profile URL.
              React Router v7 can't parse /@:param (@ breaks the segment
              parser), so we use /:handle and strip the @ in the component. */}
          <Route
            path="/:handle"
            element={
              <PublicPageShell>
                <PublicProfile />
              </PublicPageShell>
            }
          />
          {/* Legacy /profile/:profileId — kept for backward compat */}
          <Route
            path="/profile/:profileId"
            element={
              <PublicPageShell>
                <PublicProfile />
              </PublicPageShell>
            }
          />
          <Route path="/contact" element={<Contact />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/cookies" element={<CookiePolicy />} />
          <Route
            path="*"
            element={
              <div className="ed-page">
                <EditorialNavbar />
                <NotFound4042 />
                <EditorialFooter />
              </div>
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
