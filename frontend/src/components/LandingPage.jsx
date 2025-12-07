import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAuth, SignInButton } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";

export default function LandingPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const navigate = useNavigate();

  // ✅ served from /public
  const heroImg = "/hero.png";

  const [lang, setLang] = useState("english");
  const [loading, setLoading] = useState(false);
  const [hasClicked, setHasClicked] = useState(false);

  const defaultText = useMemo(
    () => ({
      heading: "Inclusive Assessments for All",
      subtext: "Pastel-perfect, tech powered, and accessibility-first",
      startNow: "Start Now",
      getStarted: "Get Started",
      feature1: "Tactile & Verbal",
      feature1Desc:
        "Braille outputs, screen readers, and narration tools for low-vision learners.",
      feature2: "Focus Friendly",
      feature2Desc:
        "Artificial intelligence simplification, distraction-free view, and clear layouts for better concentration.",
      feature3: "Adaptive Inputs",
      feature3Desc:
        "Voice, sip and puff, keyboard, and gaze tracking integration for diverse needs.",
      footer: "",
      navHome: "Home",
      navFeatures: "Features",
      navContact: "Contact",
      contactHeading: "Contact Us",
      contactLine: "Have questions or feedback?",
      tagline: "Accessibility • AI • Care",
    }),
    []
  );

  const [translated, setTranslated] = useState(defaultText);

  useEffect(() => {
    if (isLoaded && isSignedIn) navigate("/onboarding");
  }, [isLoaded, isSignedIn, navigate]);

  useEffect(() => {
    const enableAudio = () => setHasClicked(true);
    window.addEventListener("click", enableAudio, { once: true });
    return () => window.removeEventListener("click", enableAudio);
  }, []);

  const safe = (val, fallback) => {
    const t = (val || "").trim();
    if (!t || /^[\s.,…।।॥\-]+$/.test(t) || t.length < 2 || t.length > 300) return fallback;
    return t;
  };

  const handleLanguageChange = async (selectedLang) => {
    setLang(selectedLang);
    if (selectedLang === "english") {
      setTranslated(defaultText);
      return;
    }
    setLoading(true);
    const texts = Object.values(defaultText);
    try {
      const res = await fetch("http://localhost:8000/translate-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sentences: texts, lang: selectedLang }),
      });
      const data = await res.json();
      const t = data.translations || [];
      const keys = Object.keys(defaultText);
      const cleaned = {};
      for (let i = 0; i < keys.length; i++) cleaned[keys[i]] = safe(t[i], texts[i]);
      setTranslated(cleaned);
    } catch (err) {
      console.error("Translation failed:", err);
    }
    setLoading(false);
  };

  const speak = (text) => {
    if (!text || !hasClicked || lang !== "english") return;
    const synth = window.speechSynthesis;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "en-US";
    utter.rate = 1;
    synth.cancel();
    synth.speak(utter);
  };
  const hoverSpeak = (text) => () => speak(text);

  // ambient cursor light (kept)
  const wrapRef = useRef(null);
  const spotRef = useRef(null);
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (prefersReduced) return;
    const el = wrapRef.current;
    const spot = spotRef.current;
    if (!el || !spot) return;
    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      spot.style.setProperty("--mx", `${x}px`);
      spot.style.setProperty("--my", `${y}px`);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [prefersReduced]);

  // magnetic buttons
  const makeMagnet = (btnRef) => (e) => {
    if (prefersReduced) return;
    const btn = btnRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const x = (e.clientX - r.left - r.width / 2) / 12;
    const y = (e.clientY - r.top - r.height / 2) / 12;
    btn.style.transform = `translate(${x}px, ${y}px)`;
  };
  const resetMagnet = (btnRef) => () => {
    const btn = btnRef.current;
    if (btn) btn.style.transform = "translate(0,0)";
  };
  const cta1Ref = useRef(null);
  const cta2Ref = useRef(null);

  return (
    <div ref={wrapRef} className={`lx ${loading ? "isLoading" : ""}`}>
      {/* Ambient layers */}
      <div className="lx_noise" aria-hidden="true" />
      <div className="lx_grid" aria-hidden="true" />
      <div ref={spotRef} className="lx_spot" aria-hidden="true" />

      {/* NAV */}
      <nav className="lx_nav">
        <div className="lx_brand" aria-label="AbleX">AbleX</div>

        <div className="lx_navRight">
          <select
            value={lang}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="lx_select"
            aria-label="Language"
            title="Language"
          >
            <option value="english">English</option>
            <option value="kannada">Kannada</option>
            <option value="hindi">Hindi</option>
          </select>

          <ul className="lx_links">
            <li onMouseEnter={hoverSpeak(translated.navHome)}><a href="#home">{translated.navHome}</a></li>
            <li onMouseEnter={hoverSpeak(translated.navFeatures)}><a href="#features">{translated.navFeatures}</a></li>
            <li onMouseEnter={hoverSpeak(translated.navContact)}><a href="#contact">{translated.navContact}</a></li>
          </ul>

          <SignInButton mode="modal" redirectUrl="/onboarding">
            <button
              ref={cta1Ref}
              className="lx_btn lx_btnPrimary"
              onMouseMove={makeMagnet(cta1Ref)}
              onMouseLeave={resetMagnet(cta1Ref)}
            >
              {translated.getStarted}
            </button>
          </SignInButton>
        </div>
      </nav>

      {/* HERO */}
      <section id="home" className="lx_hero">
        <div className="lx_copy">
          <h1 className="lx_title" onMouseEnter={hoverSpeak(translated.heading)}>
            {translated.heading}
          </h1>
          <p className="lx_sub" onMouseEnter={hoverSpeak(translated.subtext)}>
            {translated.subtext}
          </p>

          <SignInButton mode="modal" redirectUrl="/onboarding">
            <button
              ref={cta2Ref}
              className="lx_btn lx_btnGlow"
              onMouseMove={makeMagnet(cta2Ref)}
              onMouseLeave={resetMagnet(cta2Ref)}
            >
              {translated.startNow}
            </button>
          </SignInButton>
        </div>

        {/* RIGHT: IMAGE ONLY */}
        <div className="lx_mediaOnly">
          <img
            className="lx_mediaImg"
            src={heroImg}
            alt="Smiling student using accessible, inclusive learning tools"
          />
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="lx_features">
        <article className="card" onMouseEnter={hoverSpeak(translated.feature1)}>
          <div className="emoji">🔠</div>
          <h2 className="cardTitle">{translated.feature1}</h2>
          <p className="cardText">{translated.feature1Desc}</p>
          <div className="shine" aria-hidden="true" />
        </article>

        <article className="card" onMouseEnter={hoverSpeak(translated.feature2)}>
          <div className="emoji">🎯</div>
          <h2 className="cardTitle">{translated.feature2}</h2>
          <p className="cardText">{translated.feature2Desc}</p>
          <div className="shine" aria-hidden="true" />
        </article>

        <article className="card" onMouseEnter={hoverSpeak(translated.feature3)}>
          <div className="emoji">💡</div>
          <h2 className="cardTitle">{translated.feature3}</h2>
          <p className="cardText">{translated.feature3Desc}</p>
          <div className="shine" aria-hidden="true" />
        </article>
      </section>

      {/* CONTACT */}
      <section id="contact" className="lx_contact">
        <h2 className="lx_contactTitle">{translated.contactHeading}</h2>
        <p className="lx_contactText">
          {translated.contactLine}{" "}
          <a className="lx_link" href="mailto:hello@ablex.com">bhanushri@ablex.com</a>
        </p>
      </section>

      <footer className="lx_footer">{translated.footer}</footer>

      {/* STYLES */}
      <style>{`
        html, body, #root { height:auto; min-height:100%; }
        body { overflow-y:auto; -webkit-overflow-scrolling:touch; }

        :root{
          --ink:#0b1220; --muted:#4b5563; --muted2:#64748b;
          --gA:#7ed6df; --gB:#f8a5c2; --gC:#a78bfa; --gD:#60a5fa; --gE:#34d399;
          --card:rgba(255,255,255,.72); --glass:rgba(255,255,255,.6);
          --bd:rgba(228,231,236,.85);
        }
        .lx{
          position:relative; min-height:100vh; overflow-x:hidden; overflow-y:auto;
          color:var(--ink);
          font-family:'Poppins', system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
          background:
            radial-gradient(1200px 700px at 20% -10%, #d9f4ff 0%, transparent 50%),
            radial-gradient(1200px 700px at 120% 0%, #ffd9ec 0%, transparent 55%),
            linear-gradient(180deg, #f8fbff 0%, #f6f3ff 100%);
          isolation:isolate;
        }
        .lx.isLoading{opacity:.45; pointer-events:none; user-select:none;}

        .lx_noise{ pointer-events:none; position:fixed; inset:-20px; z-index:0;
          background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 40 40'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3CfeComponentTransfer%3E%3CfeFuncA type='table' tableValues='0 0 0 .06 .1 0'/%3E%3C/feComponentTransfer%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          opacity:.35; mix-blend-mode:overlay;
        }
        .lx_grid{ pointer-events:none; position:fixed; inset:0; z-index:1;
          background:
            linear-gradient(rgba(11,18,32,.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(11,18,32,.06) 1px, transparent 1px);
          background-size:28px 28px;
          mask-image:radial-gradient(70% 60% at 50% 30%, #000 60%, transparent 100%);
          animation: grid 45s linear infinite;
        }
        @keyframes grid{ 0%{background-position:0 0,0 0} 100%{background-position:96px 96px,96px 96px} }

        .lx_spot{ pointer-events:none; position:fixed; inset:0; z-index:2;
          --mx:50vw; --my:35vh;
          background:
            radial-gradient(250px 250px at var(--mx) var(--my), rgba(255,255,255,.9), transparent 60%),
            radial-gradient(160px 160px at calc(var(--mx) + 280px) calc(var(--my) - 160px), rgba(255,255,255,.55), transparent 60%);
          mix-blend-mode:soft-light; opacity:.8;
        }
        @media (prefers-reduced-motion: reduce){ .lx_spot{ display:none; } }

        .lx_nav{
          position:sticky; top:10px; z-index:50; max-width:1220px; margin:12px auto 0;
          padding:.85rem 1.25rem; display:flex; align-items:center; justify-content:space-between;
          border:1px solid var(--bd); border-radius:18px;
          background:linear-gradient(180deg, rgba(255,255,255,.9), rgba(255,255,255,.72));
          backdrop-filter: blur(12px);
          box-shadow:0 10px 34px rgba(15,23,42,.08);
        }
        .lx_brand{
          font-weight:900; letter-spacing:.4px; font-size:1.8rem;
          background:linear-gradient(90deg, var(--gD), var(--gC));
          -webkit-background-clip:text; -webkit-text-fill-color:transparent;
        }
        .lx_navRight{ display:flex; align-items:center; gap:1.1rem; }
        .lx_links{ list-style:none; display:flex; gap:1.25rem; margin:0; padding:0; }
        .lx_links a{ color:#334155; text-decoration:none; font-weight:700;
          padding:.45rem .75rem; border-radius:10px; transition: all .25s; }
        .lx_links a:hover{ background:rgba(255,255,255,.75); box-shadow:0 10px 26px rgba(15,23,42,.08); }

        .lx_select{ appearance:none; border:1px solid var(--bd); border-radius:12px;
          padding:.55rem .9rem; background:#fff; color:#334155; font-weight:700;
          box-shadow:0 6px 18px rgba(15,23,42,.06);
        }

        .lx_btn{ border:none; border-radius:999px; cursor:pointer; font-weight:900; letter-spacing:.3px;
          transform:translateZ(0); transition:transform .2s, filter .2s, box-shadow .2s; will-change: transform;
        }
        .lx_btnPrimary{ padding:.75rem 1.35rem; color:#fff;
          background:linear-gradient(90deg, var(--gD), var(--gC));
          box-shadow:0 14px 34px rgba(96,165,250,.36);
        }
        .lx_btnPrimary:hover{ filter:saturate(1.05); box-shadow:0 18px 40px rgba(96,165,250,.45); }
        .lx_btnGlow{ padding:1rem 2.2rem; color:#fff;
          background:
            radial-gradient(120% 120% at -10% -20%, rgba(255,255,255,.28), transparent 60%),
            linear-gradient(90deg, var(--gB), var(--gA));
          box-shadow: 0 18px 48px rgba(248,165,194,.35), inset 0 0 0 1px rgba(255,255,255,.7);
        }
        .lx_btnGlow:hover{ filter:saturate(1.06) brightness(1.02); box-shadow:0 26px 60px rgba(248,165,194,.45), inset 0 0 0 1px rgba(255,255,255,.9); }

        .lx_hero{
          max-width:1220px; margin:4rem auto 2rem; padding:0 1.4rem;
          display:grid; grid-template-columns:1.1fr .9fr; gap:2rem; align-items:center;
        }
        @media (max-width: 980px){ .lx_hero{ grid-template-columns:1fr; } }

        .lx_copy{ min-width:0; }
        .lx_title{
          margin:0 0 .6rem 0;
          font-size:clamp(2.3rem, 6vw, 4.6rem);
          line-height:1.03; font-weight:900;
          background:linear-gradient(90deg, var(--gA), var(--gB));
          -webkit-background-clip:text; -webkit-text-fill-color:transparent;
          text-shadow: 0 2px 0 rgba(255,255,255,.35);
        }
        .lx_sub{ margin:0 0 1.8rem 0; color:var(--muted); font-size:clamp(1.05rem, 1.8vw, 1.25rem); max-width:46ch; }

        /* RIGHT: image only */
        .lx_mediaOnly{
          position:relative; min-height:360px; border-radius:26px; overflow:hidden;
          border:1px solid var(--bd);
          background:#fff;
          box-shadow:0 28px 70px rgba(15,23,42,.12);
        }
        .lx_mediaImg{
          width:100%; height:100%; object-fit:cover; display:block;
          transform:translateZ(0);
        }

        .lx_features{
          display:grid; grid-template-columns: repeat(auto-fit, minmax(260px,1fr));
          gap:2rem; max-width:1220px; margin:2.8rem auto; padding:0 1.4rem;
        }
        .card{
          position:relative; padding:2.3rem; text-align:center;
          border-radius:22px; background:var(--card); border:1px solid var(--bd);
          backdrop-filter: blur(10px); box-shadow:0 20px 50px rgba(15,23,42,.12);
          transition: transform .28s cubic-bezier(.2,.8,.2,1), box-shadow .28s;
        }
        .card:hover{ transform:translateY(-6px) scale(1.015); box-shadow:0 26px 64px rgba(15,23,42,.16); }
        .emoji{ font-size:2.25rem; margin-bottom:.6rem; filter: drop-shadow(0 2px 8px rgba(15,23,42,.15)); }
        .cardTitle{ margin:.15rem 0 .3rem; font-weight:900; font-size:1.18rem; color:#0f172a; }
        .cardText{ margin:0; color:var(--muted2); line-height:1.35rem; }
        .shine{
          position:absolute; inset:-2px; border-radius:inherit; pointer-events:none;
          background: conic-gradient(from 210deg, rgba(126,214,223,.18), rgba(167,139,250,.18), rgba(248,165,194,.18), transparent 40%);
          mix-blend-mode:soft-light; filter:blur(18px); opacity:.65;
        }

        .lx_contact{ text-align:center; max-width:900px; margin:3.2rem auto; padding:0 1.4rem; }
        .lx_contactTitle{ font-size:1.6rem; font-weight:900; margin:0 0 .6rem 0; }
        .lx_contactText{ color:var(--muted); margin:0; }
        .lx_link{ color:#2563eb; text-decoration:none; font-weight:800; }
        .lx_link:hover{ text-decoration:underline; }

        .lx_footer{ text-align:center; padding:2rem 1rem; color:#6b7280; font-size:.95rem; }
      `}</style>
    </div>
  );
}
