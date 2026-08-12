import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { EditorialNavbar } from './components/editorial/EditorialNavbar';
import { EditorialFooter } from './components/editorial/EditorialFooter';
import { PublicPageShell } from './components/PublicPageShell';
import { ProtectedDashboardRoute } from './components/ProtectedDashboardRoute';

const Home = lazy(() => import('./pages/Home').then((module) => ({ default: module.Home })));
const OurThesis = lazy(() => import('./pages/OurThesis').then((module) => ({ default: module.OurThesis })));
const ForFounders = lazy(() => import('./pages/ForFounders').then((module) => ({ default: module.ForFounders })));
const ForVCs = lazy(() => import('./pages/ForVCs').then((module) => ({ default: module.ForVCs })));
const HeatMap = lazy(() => import('./pages/HeatMap').then((module) => ({ default: module.HeatMap })));
const AboutUs = lazy(() => import('./pages/AboutUs').then((module) => ({ default: module.AboutUs })));
const Blog = lazy(() => import('./pages/Blog').then((module) => ({ default: module.Blog })));
const BlogPost = lazy(() => import('./pages/Blog').then((module) => ({ default: module.BlogPost })));
const Contact = lazy(() => import('./pages/Contact').then((module) => ({ default: module.Contact })));
const ProjectDetail = lazy(() => import('./pages/ProjectDetail').then((module) => ({ default: module.ProjectDetail })));
const SourcedDetail = lazy(() => import('./pages/SourcedDetail').then((module) => ({ default: module.SourcedDetail })));
const PublicProfile = lazy(() => import('./pages/PublicProfile').then((module) => ({ default: module.PublicProfile })));
const Resources = lazy(() => import('./pages/Resources').then((module) => ({ default: module.Resources })));
const ClaimProfile = lazy(() => import('./pages/ClaimProfile').then((module) => ({ default: module.ClaimProfile })));
const ClaimBuild = lazy(() => import('./pages/ClaimBuild').then((module) => ({ default: module.ClaimBuild })));
const Login = lazy(() => import('./pages/Login').then((module) => ({ default: module.Login })));
const Dashboard = lazy(() => import('./pages/Dashboard').then((module) => ({ default: module.Dashboard })));
const CookiePolicy = lazy(() => import('./pages/Legal').then((module) => ({ default: module.CookiePolicy })));
const PrivacyPolicy = lazy(() => import('./pages/Legal').then((module) => ({ default: module.PrivacyPolicy })));
const TermsOfService = lazy(() => import('./pages/Legal').then((module) => ({ default: module.TermsOfService })));
const NotFound4042 = lazy(() => import('./components/4042'));

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
      <div className="min-h-screen bg-background text-foreground">
        <ScrollToHash />
        <Suspense fallback={<div className="min-h-screen bg-background" aria-label="Loading page" />}>
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
        </Suspense>
      </div>
    </Router>
  );
}

export default App;
