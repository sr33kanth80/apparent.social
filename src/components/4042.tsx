import { Link } from "react-router-dom";

type NotFound4042Props = {
  title?: string;
  message?: string;
  primaryLabel?: string;
  primaryTo?: string;
  secondaryLabel?: string;
  secondaryTo?: string;
};

// Content only (no nav/footer): used standalone via the catch-all route (which
// supplies the editorial chrome) and inline inside data pages that already have it.
export default function _4042({
  title = "Page not found",
  message = "If you typed the URL directly, please make sure the spelling is correct.",
  primaryLabel = "Go back home",
  primaryTo = "/",
  secondaryLabel = "Contact support",
  secondaryTo = "/contact",
}: NotFound4042Props) {
  return (
    <section className="ed-sec ed-inner" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "clamp(24px,5vw,64px)", alignItems: "center", minHeight: "62vh" }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--ed-smoke)" }}>404</div>
        <h1 className="ed-display" style={{ marginTop: 12, fontSize: "clamp(2.4rem,6vw,72px)" }}>{title}</h1>
        <p className="ed-lede" style={{ marginTop: 20 }}>{message}</p>
        <div className="ed-cta" style={{ marginTop: 28 }}>
          <Link className="ed-btn ed-btn-filled" to={primaryTo}>{primaryLabel}</Link>
          <Link className="ed-btn ed-btn-outline" to={secondaryTo}>{secondaryLabel}</Link>
        </div>
      </div>
      <div style={{ display: "grid", placeItems: "center" }}>
        <svg style={{ height: "min(60vw, 360px)", color: "var(--ed-fog)" }} xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 300 300" aria-hidden="true">
          <path d="M115.7 45.6c-.8.8 6.2 14.4 7.4 14.4 1.5 0 1.1-1.6-2.3-8.5-3.2-6.3-3.8-7.1-5.1-5.9zM91.6 47.7c-.7.7 23.2 25.3 24.6 25.3 2.4 0-.4-3.7-10.9-14.2-6.5-6.5-12-11.8-12.4-11.8-.3 0-.9.3-1.3.7zM197.1 54.5c-3 3.8-4.6 6.7-4 7.1.6.3 1.1.4 1.3.3.1-.2 2.3-2.9 4.9-6 4.5-5.4 5.7-7.9 3.8-7.9-.5 0-3.2 2.9-6 6.5zM167.5 55c-.3.5.1 1 .9 1s1.7.4 2.1.9c.3.6-1.5 1-4.4.9-5.1 0-8.2 1.1-11.6 4.3-1.8 1.6-2.6 1.7-5.6.8-7.7-2.4-14.7 4.1-13.5 12.5.6 3.8.5 4-.9 2.2-1.9-2.5-1.9-6.7 0-9.2 2.4-3.1 1.9-5.2-.7-2.7-1.6 1.6-2.2 3.5-2.2 7-.1 4.2.2 4.9 3.1 6.8l3.2 2.2-4.1 1.2c-2.2.7-5.9 2.9-8.1 5-2.3 2.1-5.1 4.1-6.3 4.5-2.8.8-4.7 5.1-3.4 7.5 1 2 .4 3.1-1.8 3.1-2.7 0-7.1 4.1-10.1 9.4-3.6 6.2-3.9 9.4-1.1 12.9l2 2.5-2.5.6c-2.1.5-5.6 4.6-6.7 7.8-.2.4-7.3 1.2-15.9 1.8-17 1.1-23.1 2.5-28.8 6.4-7.7 5.4-9.5 12.1-11.1 43.3-.5 10.3-1 24.1-1 30.5V230l-5.2.1c-2.9.1-7.8.4-10.8.9-5.2.7 1.6 1.1 24.7 1.4 2.8.1 3.6.7 5.7 4.6 5.5 10.3 10.3 14.1 20.1 15.6 4.5.7 4.7.8 2 1.4-2.8.5-3 .8-2.8 4.6l.3 4-3.8-.4c-2-.2-6.8.1-10.7.6-4.6.6 30.9.9 102 .9 60 0 106.3-.3 103-.7-3.3-.4-12.5-.8-20.5-.9l-14.6-.1.4-4c.4-3.8.3-4-2.4-4.1-2.8-.1-2.8-.1.6-1.1 1.9-.5 5.2-1.4 7.2-1.9 4.2-1.1 8.8-5.9 12.9-13.6l2.6-4.8 11.9-.5c6.5-.4 10.3-.7 8.2-.8l-3.6-.2-.6-7.3c-.3-3.9-1.2-20-1.9-35.7-1.5-30.9-2-33.6-8.1-40.7-5.5-6.5-13.8-8.5-40.7-9.9l-12.7-.6-.6-2.9c-.3-1.6-1.7-3.9-3.1-5.1-2.9-2.5-3.2-5.9-.9-11.4 2.3-5.6 1.1-11.9-3.1-16.1-2-2-4.3-3.3-5.9-3.3-2.3 0-2.6-.4-2.6-3.3 0-3.7-2.5-6.7-5.6-6.7-2 0-4.4-1.7-4.4-3.2 0-.4 1.1-.8 2.5-.8 3.1 0 5-3.2 3.5-5.9-.5-1.1-1-3.9-1-6.3 0-4.3-1.4-7.1-5.7-11.9-1.3-1.3-3-3.2-3.8-4.2-1.7-1.9-3.1-2.2-4-.7z" />
        </svg>
      </div>
    </section>
  );
}
