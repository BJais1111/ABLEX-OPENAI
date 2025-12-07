// src/components/DashboardStudent.jsx
import React, { useEffect, useState } from "react";
import { UserButton, useUser } from "@clerk/clerk-react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function DashboardStudent() {
  const { user } = useUser();
  const navigate = useNavigate();

  const [language, setLanguage] = useState("english");
  const [labels, setLabels] = useState({});
  const [assessments, setAssessments] = useState([]);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [hasClicked, setHasClicked] = useState(false);

  // default English labels
  const englishLabels = [
    "Welcome",
    "Available Assessments",
    "Start Assessment",
    "Timer",
    "Created By",
    "No assessments available.",
    "Accessibility Settings",
  ];

  const labelKeys = [
    "heading",
    "available",
    "start",
    "timer",
    "created",
    "none",
    "settings",
  ];

  const loadTranslations = async (lang) => {
    if (lang === "english") return;

    const cached = localStorage.getItem(`labels-${lang}`);
    if (cached) {
      setLabels(JSON.parse(cached));
      return;
    }

    try {
      const { data } = await axios.post(
        "http://localhost:8000/translate-batch",
        { sentences: englishLabels, lang }
      );
      const t = data.translations;
      const mapped = {};
      labelKeys.forEach((key, i) => {
        mapped[key] = t[i] || englishLabels[i];
      });
      setLabels(mapped);
      localStorage.setItem(`labels-${lang}`, JSON.stringify(mapped));
    } catch (err) {
      console.error("Translation error:", err);
    }
  };

  // TTS: Web Speech for English, Dwani for other languages
  const speak = async (text) => {
    if (!text) return;
    if (!hasClicked) return; // respect user interaction before audio

    if (language === "english") {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = "en-US";
      window.speechSynthesis.speak(utter);
    } else {
      try {
        const audioRes = await axios.post(
          "http://localhost:5005/tts",
          new URLSearchParams({ text }),
          { responseType: "blob" }
        );
        const audioUrl = URL.createObjectURL(audioRes.data);
        const audio = new Audio(audioUrl);
        await audio.play();
      } catch (err) {
        console.error("TTS error:", err);
      }
    }
  };

  // on mount: get user prefs and load translations
  useEffect(() => {
    if (user?.id) {
      axios
        .get(`http://localhost:5000/get-user/${user.id}`)
        .then(({ data }) => {
          const lang = data.language || "english";
          setLanguage(lang);
          if (lang !== "english") loadTranslations(lang);
        })
        .catch(console.error);
    }
  }, [user]);

  // fetch assessments
  useEffect(() => {
    axios
      .get("http://localhost:5000/assessments/all")
      .then(({ data }) => setAssessments(data))
      .catch(console.error);
  }, []);

  // require a click to enable audio autoplay
  useEffect(() => {
    const onFirstClick = () => setHasClicked(true);
    window.addEventListener("click", onFirstClick, { once: true });
    return () => window.removeEventListener("click", onFirstClick);
  }, []);

  // handle keyboard activation on cards
  const handleCardKey = (e, id) => {
    if (e.key === "Enter" || e.key === " ") {
      navigate(`/assessment/${id}`);
    }
  };

  /* ------------------- Shared pastel / SaaS-y styles ------------------- */

  const styles = {
    page: {
      minHeight: "100vh",
      padding: "1.5rem 2rem 3rem",
      background:
        "linear-gradient(135deg, #eef2ff 0%, #e0f2fe 40%, #fdf2ff 100%)",
      fontFamily: "'Poppins', system-ui, sans-serif",
      color: "#0f172a",
      display: "flex",
      flexDirection: "column",
      boxSizing: "border-box",
    },
    topBar: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: "1.5rem",
    },
    logoBlock: {
      display: "flex",
      flexDirection: "column",
      gap: "0.15rem",
    },
    logoText: {
      fontWeight: 800,
      letterSpacing: "0.08em",
      fontSize: "0.9rem",
      textTransform: "uppercase",
      color: "#6b7280",
    },
    logoSub: {
      fontSize: "0.8rem",
      color: "#9ca3af",
    },
    userWrapper: {
      display: "flex",
      alignItems: "center",
      gap: "0.75rem",
    },
    userLabel: {
      fontSize: "0.9rem",
      color: "#6b7280",
    },
    mainShell: {
      maxWidth: 1200,
      width: "100%",
      margin: "0 auto",
      flex: 1,
      display: "flex",
      flexDirection: "column",
      gap: "2rem",
    },
    hero: {
      background:
        "linear-gradient(135deg, rgba(255,255,255,0.96), rgba(239,246,255,0.96))",
      borderRadius: 24,
      padding: "1.75rem 2rem",
      boxShadow: "0 18px 45px rgba(15,23,42,0.08)",
      border: "1px solid rgba(148,163,184,0.35)",
      backdropFilter: "blur(10px)",
      display: "flex",
      flexDirection: "column",
      gap: "0.75rem",
    },
    heroChipRow: {
      display: "flex",
      alignItems: "center",
      gap: "0.75rem",
      flexWrap: "wrap",
    },
    chip: {
      fontSize: "0.75rem",
      padding: "0.25rem 0.75rem",
      borderRadius: 999,
      border: "1px solid rgba(129,140,248,0.5)",
      color: "#4f46e5",
      background: "rgba(238,242,255,0.7)",
      fontWeight: 600,
    },
    heroTitle: {
      fontSize: "2.15rem",
      fontWeight: 800,
      margin: 0,
      background: "linear-gradient(90deg, #2563eb, #4f46e5, #a855f7)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
    },
    heroSub: {
      margin: 0,
      fontSize: "1rem",
      color: "#4b5563",
      maxWidth: 640,
      lineHeight: 1.6,
    },
    heroMetaRow: {
      marginTop: "0.75rem",
      display: "flex",
      gap: "1.5rem",
      flexWrap: "wrap",
      fontSize: "0.9rem",
      color: "#6b7280",
    },
    metaPill: {
      padding: "0.25rem 0.7rem",
      borderRadius: 999,
      backgroundColor: "rgba(15,23,42,0.03)",
      border: "1px dashed rgba(148,163,184,0.6)",
    },

    /* 🔁 UPDATED Accessibility Settings button styling */
    settingsButton: {
      padding: "0.4rem 0.9rem",
      borderRadius: 999,
      border: "none",
      background: "rgba(79,70,229,0.06)",
      color: "#4f46e5",
      fontSize: "0.85rem",
      fontWeight: 600,
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      gap: "0.35rem",
      boxShadow: "0 0 0 1px rgba(129,140,248,0.35)",
      transition: "background 0.15s ease, box-shadow 0.15s ease, transform 0.1s",
    },
    settingsButtonHover: {
      background: "rgba(79,70,229,0.12)",
      boxShadow: "0 6px 16px rgba(79,70,229,0.25)",
      transform: "translateY(-1px)",
    },
    settingsIcon: {
      fontSize: "1rem",
      lineHeight: 1,
    },

    sectionHeader: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: "0.25rem",
      marginBottom: "0.9rem",
    },
    sectionTitle: {
      fontSize: "1.3rem",
      fontWeight: 700,
      color: "#111827",
      position: "relative",
      display: "inline-flex",
      alignItems: "center",
      gap: "0.4rem",
    },
    sectionBar: {
      position: "absolute",
      left: 0,
      bottom: -6,
      width: "70px",
      height: "4px",
      background:
        "linear-gradient(90deg, #2563eb, #4f46e5, #a855f7)",
      borderRadius: "999px",
    },
    sectionHint: {
      fontSize: "0.9rem",
      color: "#6b7280",
    },
    cardContainer: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
      gap: "1.5rem",
    },
    card: {
      background:
        "linear-gradient(145deg, rgba(255,255,255,0.98), rgba(239,246,255,0.98))",
      borderRadius: 20,
      padding: "1.5rem 1.6rem",
      boxShadow: "0 12px 30px rgba(15,23,42,0.08)",
      border: "1px solid rgba(226,232,240,0.9)",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      minHeight: 160,
      cursor: "pointer",
      transition: "transform 0.2s ease, box-shadow 0.2s ease, border 0.2s",
      outline: "none",
    },
    cardHover: {
      transform: "translateY(-6px)",
      boxShadow: "0 18px 40px rgba(15,23,42,0.12)",
      border: "1px solid rgba(129,140,248,0.7)",
    },
    cardTitle: {
      fontSize: "1.2rem",
      marginBottom: "0.6rem",
      color: "#111827",
      fontWeight: 600,
    },
    cardTextRow: {
      display: "flex",
      flexWrap: "wrap",
      gap: "0.4rem",
      marginBottom: "0.6rem",
    },
    pill: {
      fontSize: "0.8rem",
      padding: "0.25rem 0.6rem",
      borderRadius: 999,
      backgroundColor: "#eff6ff",
      color: "#1d4ed8",
      display: "inline-flex",
      alignItems: "center",
      gap: "0.3rem",
      border: "1px solid rgba(191,219,254,0.9)",
    },
    pillLabel: {
      fontWeight: 600,
    },
    pillMuted: {
      backgroundColor: "#f9fafb",
      color: "#4b5563",
      border: "1px solid rgba(209,213,219,0.9)",
    },
    cardFooter: {
      marginTop: "1rem",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: "0.5rem",
    },
    startButton: {
      padding: "0.55rem 1.2rem",
      borderRadius: 999,
      border: "none",
      background: "linear-gradient(135deg, #2563eb, #4f46e5)",
      color: "#ffffff",
      fontSize: "0.95rem",
      fontWeight: 600,
      cursor: "pointer",
      boxShadow: "0 8px 18px rgba(37,99,235,0.35)",
      outline: "none",
      whiteSpace: "nowrap",
    },
    emptyText: {
      fontSize: "0.95rem",
      color: "#6b7280",
      padding: "0.8rem 0.2rem",
    },
  };

  const headingText =
    (labels.heading || "Welcome") + ", " + (user?.firstName || "Student");

  const settingsLabel = labels.settings || "Accessibility Settings";

  const [settingsHover, setSettingsHover] = useState(false);

  return (
    <div style={styles.page}>
      {/* Top bar */}
      <div style={styles.topBar}>
        <div style={styles.logoBlock}>
          <div style={styles.logoText}>AbleX • Student Console</div>
          <div style={styles.logoSub}>Accessible assessments made for you</div>
        </div>
        <div style={styles.userWrapper}>
          <span style={styles.userLabel}>Signed in</span>
          <UserButton afterSignOutUrl="/" />
          {/* 🔁 Updated Accessibility Settings UI */}
          <button
            type="button"
            style={{
              ...styles.settingsButton,
              ...(settingsHover ? styles.settingsButtonHover : {}),
            }}
            onMouseEnter={() => {
              setSettingsHover(true);
              speak(settingsLabel);
            }}
            onMouseLeave={() => setSettingsHover(false)}
            onClick={() => navigate("/settings")}
            tabIndex={0}
            onFocus={() => speak(settingsLabel)}
            aria-label={settingsLabel}
            title={settingsLabel}
          >
            <span style={styles.settingsIcon}>⚙️</span>
            <span>{settingsLabel}</span>
          </button>
        </div>
      </div>

      <main style={styles.mainShell}>
        {/* Hero block */}
        <section
          style={styles.hero}
          onMouseEnter={() =>
            speak(
              `${labels.heading || "Welcome"}, ${
                user?.firstName || "Student"
              }. This is your assessment space.`
            )
          }
        >
          <div style={styles.heroChipRow}>
            <span style={styles.chip}>Your assessment space</span>
          </div>
          <h1
            style={styles.heroTitle}
            tabIndex={0}
            onFocus={() => speak(headingText)}
          >
            {headingText}
          </h1>
          <p style={styles.heroSub}>
            Complete accessible assessments at your own pace. Your support
            settings from AbleX will automatically adapt for you.
          </p>
          <div style={styles.heroMetaRow}>
            <span style={styles.metaPill}>Personalized accessibility</span>
            <span style={styles.metaPill}>
              Keyboard & assistive input friendly
            </span>
          </div>
        </section>

        {/* Available Assessments */}
        <section>
          <div style={styles.sectionHeader}>
            <h2
              style={styles.sectionTitle}
              tabIndex={0}
              onFocus={() =>
                speak(labels.available || "Available Assessments")
              }
            >
              {labels.available || "Available Assessments"}
              <span style={styles.sectionBar} />
            </h2>
            <span style={styles.sectionHint}>
              Choose an assessment to begin.
            </span>
          </div>

          <div style={styles.cardContainer}>
            {assessments.length === 0 ? (
              <p
                tabIndex={0}
                style={styles.emptyText}
                onFocus={() =>
                  speak(labels.none || "No assessments available.")
                }
              >
                {labels.none || "No assessments available."}
              </p>
            ) : (
              assessments.map((a) => (
                <div
                  key={a._id}
                  style={{
                    ...styles.card,
                    ...(hoveredCard === a._id ? styles.cardHover : {}),
                  }}
                  onMouseEnter={() => {
                    setHoveredCard(a._id);
                    speak(a.title);
                  }}
                  onMouseLeave={() => setHoveredCard(null)}
                  tabIndex={0}
                  onFocus={() => speak(a.title)}
                  onKeyDown={(e) => handleCardKey(e, a._id)}
                >
                  <div>
                    <h3 style={styles.cardTitle}>{a.title}</h3>
                    <div style={styles.cardTextRow}>
                      <span style={styles.pill}>
                        <span style={styles.pillLabel}>
                          {labels.timer || "Timer"}:
                        </span>{" "}
                        {a.timer} min
                      </span>
                      <span style={{ ...styles.pill, ...styles.pillMuted }}>
                        <span style={styles.pillLabel}>
                          {labels.created || "Created By"}:
                        </span>{" "}
                        {a.creatorName || a.createdBy || "Educator"}
                      </span>
                    </div>
                  </div>

                  <div style={styles.cardFooter}>
                    <span style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
                      Click to begin
                    </span>
                    <button
                      style={styles.startButton}
                      onClick={() => navigate(`/assessment/${a._id}`)}
                      tabIndex={0}
                      onFocus={() =>
                        speak(labels.start || "Start Assessment")
                      }
                    >
                      {labels.start || "Start Assessment"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
