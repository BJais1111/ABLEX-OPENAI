// src/components/AccessibilitySettings.jsx
import React, { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import axios from "axios";

export default function AccessibilitySettings() {
  const { user } = useUser();
  const [supports, setSupports] = useState([]);
  const [motorPreference, setMotorPreference] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [translatedText, setTranslatedText] = useState({});

  const MAX = 2;

  const TEXT_KEYS = {
    title: "Accessibility Settings",
    subtitle: "Edit your accessibility preferences below.",
    sectionTitle: "Select Support Needs (max 2)",
    motorLabel: "Motor Preference:",
    saveButton: "Save Preferences",
    loadingText: "Loading your settings...",
    motorDropdown: "Select a motor preference",
  };

  const SUPPORT_OPTIONS = [
    { label: "Visual Support", value: "visual" },
    { label: "Motor Support", value: "motor" },
      { label: "Cognitive Support", value: "cognitive" },
    { label: "ADHD Support", value: "adhd" },
    { label: "Autism Support", value: "autism" },
    
  ];

  // ---- motor mapping: DB <-> UI (DB uses: 'braille' | 'sip' | 'eye')
  const motorDBtoUI = (val) => {
    if (!val) return "";
    if (val === "sip") return "sip-puff";
    if (val === "eye") return "eye-tracking";
    return val; // 'braille' stays 'braille'
  };

  const motorUItoDB = (val) => {
    if (!val) return "";
    if (val === "sip-puff") return "sip";
    if (val === "eye-tracking") return "eye";
    return val; // 'braille'
  };

  const safe = (val, fallback) => {
    const t = (val || "").trim();
    if (!t || /^[\s.,…।।॥\-]+$/.test(t) || t.length < 2 || t.length > 300) {
      return fallback;
    }
    return t;
  };

  const normalizeSupports = (x) =>
    Array.isArray(x)
      ? x.filter(Boolean)
      : typeof x === "string"
      ? x
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

  useEffect(() => {
    if (!user?.id) return;

    (async () => {
      try {
        const { data } = await axios.get(
          `http://localhost:5000/get-user/${user.id}`
        );

        const lang = data.language || "english";
        setSupports(normalizeSupports(data.supports));
        setMotorPreference(motorDBtoUI(data.motorPreference || ""));

        const cacheKey = `translation_accessibility_${lang}`;

        // English – just use defaults
        if (lang === "english") {
          const defaults = {
            ...TEXT_KEYS,
            ...Object.fromEntries(
              SUPPORT_OPTIONS.map((o) => [o.value, o.label])
            ),
          };
          setTranslatedText(defaults);
          setLoading(false);
          return;
        }

        // cached translations
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          setTranslatedText(JSON.parse(cached));
          setLoading(false);
          return;
        }

        const sentences = [
          TEXT_KEYS.title,
          TEXT_KEYS.subtitle,
          TEXT_KEYS.sectionTitle,
          TEXT_KEYS.motorLabel,
          TEXT_KEYS.saveButton,
          TEXT_KEYS.loadingText,
          TEXT_KEYS.motorDropdown,
          ...SUPPORT_OPTIONS.map((o) => o.label),
        ];

        const res = await axios.post(
          "http://localhost:8000/translate-batch",
          { lang, sentences }
        );

        const raw = res.data.translations;
        const keys = [
          "title",
          "subtitle",
          "sectionTitle",
          "motorLabel",
          "saveButton",
          "loadingText",
          "motorDropdown",
          ...SUPPORT_OPTIONS.map((o) => o.value),
        ];

        const out = {};
        keys.forEach((k, i) => {
          out[k] = safe(raw[i], sentences[i]);
        });

        setTranslatedText(out);
        localStorage.setItem(cacheKey, JSON.stringify(out));
      } catch (err) {
        console.error("⚠️ AccessibilitySettings translation failed:", err);
        const fallback = {
          ...TEXT_KEYS,
          ...Object.fromEntries(
            SUPPORT_OPTIONS.map((o) => [o.value, o.label])
          ),
        };
        setTranslatedText(fallback);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  // ---------- TTS ----------
  const speakOnHover = (text) => {
    if (!text) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  };

  // ---------- toggle logic ----------
  const handleToggle = (value) =>
    setSupports((prev) => {
      if (prev.includes(value)) return prev.filter((v) => v !== value);

      // block motor+visual together
      if (
        (value === "motor" && prev.includes("visual")) ||
        (value === "visual" && prev.includes("motor"))
      ) {
        alert("Motor and visual support cannot be combined.");
        return prev;
      }

      const next = [...prev, value];

      if (next.length > MAX) {
        alert(`You can select up to ${MAX} support preferences.`);
        return prev;
      }

      return next;
    });

  // ---------- save ----------
  const handleUpdate = async () => {
    if (supports.length > MAX) {
      setMessage(`❌ You can select at most ${MAX} supports.`);
      return;
    }
    if (supports.includes("motor") && supports.includes("visual")) {
      setMessage("❌ Motor and visual cannot be combined.");
      return;
    }

    try {
      await axios.patch("http://localhost:5000/update-supports", {
        userId: user.id,
        supports,
        motorPreference: supports.includes("motor")
          ? motorUItoDB(motorPreference)
          : "",
      });
      setMessage("✅ Preferences updated successfully!");
    } catch (e) {
      console.error(e);
      setMessage("❌ Failed to update. Please try again.");
    }
  };

  if (loading || Object.keys(translatedText).length === 0) {
    return (
      <div style={styles.page}>
        <div style={styles.centerBox}>
          <p style={styles.loadingText}>
            {translatedText.loadingText || "Loading..."}
          </p>
        </div>
      </div>
    );
  }

  const currentSupportsText =
    supports.length === 0
      ? "No supports selected yet"
      : supports.join(", ");

  const motorLabelPretty =
    motorPreference === "sip-puff"
      ? "Sip & Puff"
      : motorPreference === "eye-tracking"
      ? "Eye Tracking"
      : motorPreference === "braille"
      ? "Braille Device"
      : "None selected";

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Header / hero */}
        <header style={styles.headerBlock}>
          <div>
            <h2
              style={styles.title}
              onMouseEnter={() => speakOnHover(translatedText.title)}
            >
              🛠️ {translatedText.title}
            </h2>
            <p
              style={styles.subtitle}
              onMouseEnter={() => speakOnHover(translatedText.subtitle)}
            >
              {translatedText.subtitle}
            </p>
          </div>
          <div style={styles.summaryPills}>
            <div
              style={styles.summaryPill}
              onMouseEnter={() => speakOnHover(currentSupportsText)}
            >
              <span style={styles.summaryLabel}>Supports</span>
              <span style={styles.summaryValue}>{currentSupportsText}</span>
            </div>
            <div
              style={styles.summaryPill}
              onMouseEnter={() =>
                speakOnHover(`Motor preference: ${motorLabelPretty}`)
              }
            >
              <span style={styles.summaryLabel}>Motor</span>
              <span style={styles.summaryValue}>{motorLabelPretty}</span>
            </div>
          </div>
        </header>

        {/* Selection card */}
        <section style={styles.sectionCard}>
          <h3
            style={styles.sectionTitle}
            onMouseEnter={() => speakOnHover(translatedText.sectionTitle)}
          >
            {translatedText.sectionTitle}
          </h3>
          <p style={styles.sectionHint}>
            Choose up to two support modes that feel most helpful to you.
          </p>

          <div style={styles.checkboxGrid}>
            {SUPPORT_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                style={{
                  ...styles.checkboxLabel,
                  ...(supports.includes(opt.value)
                    ? styles.checkboxLabelActive
                    : {}),
                }}
                onMouseEnter={() => speakOnHover(translatedText[opt.value])}
              >
                <input
                  type="checkbox"
                  checked={supports.includes(opt.value)}
                  onChange={() => handleToggle(opt.value)}
                  style={styles.checkbox}
                />
                <span style={styles.checkboxText}>
                  {translatedText[opt.value]}
                </span>
              </label>
            ))}
          </div>

          {supports.includes("motor") && (
            <div style={styles.motorBlock}>
              <label
                style={styles.motorLabel}
                onMouseEnter={() => speakOnHover(translatedText.motorLabel)}
              >
                {translatedText.motorLabel}
              </label>
              <select
                value={motorPreference}
                onChange={(e) => setMotorPreference(e.target.value)}
                onMouseEnter={() =>
                  speakOnHover(translatedText.motorDropdown)
                }
                style={styles.select}
              >
                <option value="">
                  -- {translatedText.motorDropdown} --
                </option>
                <option value="sip">Sip and Puff</option>
                <option value="eye">Eye Tracking</option>
                <option value="braille">Braille Device</option>
              </select>
              <p style={styles.motorHint}>
                You can change this anytime based on your device or comfort.
              </p>
            </div>
          )}
        </section>

        <div style={styles.footerRow}>
          <button
            style={styles.button}
            onMouseEnter={() => speakOnHover(translatedText.saveButton)}
            onClick={handleUpdate}
          >
            {translatedText.saveButton}
          </button>
          {message && (
            <p
              style={styles.message}
              onMouseEnter={() => speakOnHover(message)}
            >
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- styles ----------
const styles = {
  page: {
    minHeight: "100vh",
    padding: "1.5rem 2rem 3rem",
    background:
      "linear-gradient(135deg, #eef2ff 0%, #e0f2fe 40%, #fdf2ff 100%)",
    fontFamily: "'Poppins', system-ui, sans-serif",
    color: "#0f172a",
    boxSizing: "border-box",
  },
  centerBox: {
    maxWidth: 400,
    margin: "4rem auto",
    textAlign: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
    padding: "1.5rem 2rem",
    borderRadius: 18,
    boxShadow: "0 12px 30px rgba(15,23,42,0.08)",
  },
  loadingText: {
    fontSize: 18,
    color: "#4f46e5",
  },
  container: {
    maxWidth: 780,
    margin: "2rem auto",
    background:
      "linear-gradient(135deg, rgba(255,255,255,0.98), rgba(239,246,255,0.98))",
    borderRadius: 24,
    padding: "1.8rem 2rem 2.2rem",
    boxShadow: "0 18px 45px rgba(15,23,42,0.08)",
    border: "1px solid rgba(148,163,184,0.35)",
  },
  headerBlock: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    marginBottom: "1.5rem",
  },
  title: {
    fontSize: "1.9rem",
    fontWeight: 800,
    margin: 0,
    background: "linear-gradient(90deg, #0ea5e9, #ec4899)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  subtitle: {
    margin: 0,
    fontSize: "0.98rem",
    color: "#6b7280",
  },
  summaryPills: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.75rem",
    marginTop: "0.4rem",
  },
  summaryPill: {
    padding: "0.45rem 0.8rem",
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.02)",
    border: "1px dashed rgba(148,163,184,0.6)",
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
  },
  summaryLabel: {
    fontSize: "0.75rem",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "#9ca3af",
  },
  summaryValue: {
    fontSize: "0.9rem",
    color: "#111827",
    marginTop: 2,
  },
  sectionCard: {
    marginTop: "0.5rem",
    padding: "1.25rem 1.4rem",
    borderRadius: 18,
    backgroundColor: "#ffffff",
    border: "1px solid rgba(226,232,240,0.9)",
    boxShadow: "0 10px 25px rgba(15,23,42,0.04)",
  },
  sectionTitle: {
    fontSize: "1.1rem",
    fontWeight: 700,
    margin: 0,
    color: "#111827",
  },
  sectionHint: {
    marginTop: 6,
    marginBottom: 14,
    fontSize: "0.9rem",
    color: "#6b7280",
  },
  checkboxGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.6rem",
  },
  checkboxLabel: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "0.45rem 0.75rem",
    background: "#f9fafb",
    borderRadius: 999,
    border: "1px solid #e5e7eb",
    cursor: "pointer",
    fontSize: "0.86rem",
    color: "#374151",
    transition: "background 0.15s ease, border 0.15s ease, box-shadow 0.15s",
  },
  checkboxLabelActive: {
    background: "rgba(96,165,250,0.14)",
    border: "1px solid rgba(59,130,246,0.9)",
    boxShadow: "0 0 0 1px rgba(191,219,254,0.9)",
  },
  checkbox: {
    width: 18,
    height: 18,
    accentColor: "#3b82f6",
  },
  checkboxText: {
    whiteSpace: "nowrap",
  },
  motorBlock: {
    marginTop: 18,
    paddingTop: 12,
    borderTop: "1px dashed rgba(209,213,219,0.9)",
  },
  motorLabel: {
    display: "block",
    marginBottom: 6,
    color: "#475569",
    fontSize: "0.9rem",
    fontWeight: 500,
  },
  select: {
    width: "100%",
    padding: "0.55rem 0.75rem",
    borderRadius: 999,
    border: "1px solid #bfdbfe",
    background: "#eff6ff",
    color: "#111827",
    fontSize: "0.9rem",
    outline: "none",
  },
  motorHint: {
    marginTop: 6,
    fontSize: "0.8rem",
    color: "#6b7280",
  },
  footerRow: {
    marginTop: "1.2rem",
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    flexWrap: "wrap",
  },
  button: {
    padding: "0.7rem 1.5rem",
    background: "linear-gradient(135deg, #f472b6, #60a5fa)",
    color: "#fff",
    border: "none",
    borderRadius: 999,
    fontSize: "0.95rem",
    fontWeight: 600,
    cursor: "pointer",
    boxShadow: "0 10px 22px rgba(59,130,246,0.45)",
  },
  message: {
    fontSize: "0.9rem",
    fontWeight: 600,
    color: "#059669",
  },
};
