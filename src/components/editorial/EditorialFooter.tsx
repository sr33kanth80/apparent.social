import { Link } from 'react-router-dom';

// Full-bleed "hero" footer for the redesigned public site.
export const EditorialFooter = () => (
  <footer className="ed-footer">
    <div className="ed-inner">
      <div className="ed-bf-top">
        <div className="ed-bf-cta">
          <h2>Where proof meets capital.</h2>
          <p className="ed-bf-tag">
            Proof of work is the new warm intro. Founders show what they have built; investors find them by
            thesis, proof, and timing.
          </p>
          <div className="ed-cta">
            <Link className="ed-btn ed-btn-green ed-bf-btn" to="/login?role=investor">Source your deal flow</Link>
            <Link className="ed-btn ed-bf-btn ed-btn-outline-blue" to="/for-founders">Launch on Apparent</Link>
          </div>
        </div>
        <div className="ed-bf-cols">
          <div>
            <h4>Product</h4>
            <Link to="/for-vcs">Investor sourcing</Link>
            <Link to="/for-founders">Founder profiles</Link>
            <Link to="/heat-map">Builder Radar</Link>
            <Link to="/our-thesis">How it works</Link>
          </div>
          <div>
            <h4>Company</h4>
            <Link to="/about">About</Link>
            <Link to="/blog">Blog</Link>
            <Link to="/resources">Resources</Link>
            <Link to="/contact">Contact</Link>
          </div>
          <div>
            <h4>Get started</h4>
            <Link to="/login">Log in</Link>
            <Link to="/login">Sign up</Link>
          </div>
        </div>
      </div>
      <img className="ed-bf-word" src="/apparent-wordmark.png" alt="Apparent" />
      <div className="ed-bf-bottom">
        <span>&copy; 2026 Apparent. Verified dealflow for investors.</span>
        <span className="ed-bf-legal">
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/cookies">Cookies</Link>
        </span>
      </div>
    </div>
  </footer>
);
