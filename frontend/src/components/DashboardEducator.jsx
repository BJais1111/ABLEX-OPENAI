// src/components/DashboardEducator.jsx
import React, { useState, useEffect } from "react";
import { UserButton } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function DashboardEducator() {
  const navigate = useNavigate();
  const [hoveredCard, setHoveredCard] = useState(null);
  const [students, setStudents] = useState([]);
  const [updatedSupports, setUpdatedSupports] = useState({});

  // 🔊 Simple browser TTS
  const speak = (text, lang = "en-US") => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  // Name resolver
  const getDisplayName = (obj = {}) => {
    const fromPieces = [obj.firstName, obj.lastName].filter(Boolean).join(" ");
    const candidates = [
      obj.displayName,
      obj.name,
      obj.fullName,
      fromPieces,
      obj.username,
      obj.email,
      obj.emailAddress,
      obj.primaryEmailAddress?.emailAddress,
    ].filter((v) => typeof v === "string" && v.trim().length > 0);
    return (candidates[0] || "").trim();
  };

  // 🔁 Map DB values ↔ UI values for motorPreference
  // DB: 'braille' | 'sip' | 'eye'
  // UI: 'braille' | 'sip-puff' | 'eye-tracking'
  const motorDBtoUI = (val) => {
    if (!val) return "";
    if (val === "sip") return "sip-puff";
    if (val === "eye") return "eye-tracking";
    return val; // 'braille' passes through
  };
  const motorUItoDB = (val) => {
    if (!val) return null;
    if (val === "sip-puff") return "sip";
    if (val === "eye-tracking") return "eye";
    return val; // 'braille' passes through
  };

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        // 1) Base roster
        const { data: raw } = await axios.get(
          "http://localhost:5000/students/all"
        );

        // 2) Enrich + displayName
        const enriched = await Promise.all(
          (raw || []).map(async (s) => {
            let displayName = getDisplayName(s);
            if (!displayName) {
              try {
                const { data: profile } = await axios.get(
                  `http://localhost:5000/get-user/${s.userId}`
                );
                displayName = getDisplayName(profile);
              } catch {}
            }
            return { ...s, displayName: displayName || s.userId };
          })
        );

        setStudents(enriched);

        // 3) Initialize supports state (map motor pref to UI values)
        const initialSupports = {};
        enriched.forEach((s) => {
          initialSupports[s.userId] = {
            supports: s.supports || [],
            motorPreference: motorDBtoUI(s.motorPreference),
          };
        });
        setUpdatedSupports(initialSupports);
      } catch (err) {
        console.error("❌ Error fetching students:", err);
      }
    };

    fetchStudents();
  }, []);

  const toggleSupport = (userId, support) => {
    setUpdatedSupports((prev) => {
      const current = prev[userId]?.supports || [];
      const updated = current.includes(support)
        ? current.filter((s) => s !== support)
        : [...current, support];
      return {
        ...prev,
        [userId]: { ...prev[userId], supports: updated },
      };
    });
  };

  const updateMotor = (userId, value) => {
    setUpdatedSupports((prev) => ({
      ...prev,
      [userId]: { ...prev[userId], motorPreference: value },
    }));
  };

  const handleUpdateSupports = async (userId) => {
    try {
      const data = updatedSupports[userId] || {};
      // Normalize motor value for DB enum
      const normalizedMotor = motorUItoDB(data.motorPreference);

      await axios.patch("http://localhost:5000/update-supports", {
        userId,
        supports: data.supports || [],
        motorPreference: (data.supports || []).includes("motor")
          ? normalizedMotor
          : null,
      });

      alert("✅ Updated successfully!");
    } catch (err) {
      console.error("❌ Failed to update student:", err);
      alert("Failed to update student.");
    }
  };

  const supportOptions = [
    "visual",
    "hearing",
    "motor",
    "cognitive",
    "adhd",
    "autism",
  ];

  const styles = {
    page: {
      minHeight: "100vh",
      padding: "1.5rem 2rem 3rem",
      background:
        "linear-gradient(135deg, #e0f2fe 0%, #fdf2ff 40%, #fff7ed 100%)",
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
    logoText: {
      fontWeight: 800,
      letterSpacing: "0.08em",
      fontSize: "0.9rem",
      textTransform: "uppercase",
      color: "#6b7280",
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
        "linear-gradient(135deg, rgba(255,255,255,0.9), rgba(239,246,255,0.96))",
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
      fontSize: "2.2rem",
      fontWeight: 800,
      margin: 0,
      background: "linear-gradient(90deg, #1d4ed8, #a855f7, #ec4899)",
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
    cardsRow: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
      gap: "1.5rem",
    },
    navCard: {
      background:
        "linear-gradient(145deg, rgba(255,255,255,0.98), rgba(239,246,255,0.98))",
      borderRadius: 20,
      padding: "1.5rem 1.6rem",
      boxShadow: "0 12px 30px rgba(15,23,42,0.08)",
      border: "1px solid rgba(226,232,240,0.9)",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      minHeight: 150,
      cursor: "pointer",
      transition: "transform 0.18s ease, box-shadow 0.18s ease, border 0.18s",
    },
    navCardHover: {
      transform: "translateY(-6px)",
      boxShadow: "0 16px 40px rgba(15,23,42,0.14)",
      border: "1px solid rgba(129,140,248,0.7)",
    },
    navTitle: {
      fontSize: "1.25rem",
      margin: 0,
      marginBottom: "0.4rem",
      color: "#111827",
    },
    navDesc: {
      fontSize: "0.95rem",
      color: "#4b5563",
      margin: 0,
    },
    navFooter: {
      marginTop: "0.9rem",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      fontSize: "0.86rem",
      color: "#6b7280",
    },
    navBadge: {
      padding: "0.18rem 0.6rem",
      borderRadius: 999,
      backgroundColor: "rgba(167,139,250,0.15)",
      color: "#4c1d95",
      fontWeight: 600,
    },
    sectionHeader: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: "0.5rem",
      marginBottom: "0.8rem",
    },
    sectionTitle: {
      fontSize: "1.3rem",
      fontWeight: 700,
      color: "#111827",
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
    },
    sectionHint: {
      fontSize: "0.9rem",
      color: "#6b7280",
    },
    studentGridWrapper: {
      background: "rgba(255,255,255,0.92)",
      borderRadius: 22,
      border: "1px solid rgba(226,232,240,0.9)",
      boxShadow: "0 16px 40px rgba(15,23,42,0.08)",
      padding: "1.4rem 1.6rem",
    },
    studentGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
      gap: "1.1rem",
      maxHeight: "420px",
      overflowY: "auto",
      paddingRight: "0.4rem",
    },
    studentCard: {
      backgroundColor: "#f9fafb",
      borderRadius: 16,
      padding: "0.9rem 1rem 1rem",
      border: "1px solid rgba(209,213,219,0.9)",
      display: "flex",
      flexDirection: "column",
      gap: "0.45rem",
    },
    studentNameRow: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: "0.5rem",
    },
    studentName: {
      fontWeight: 600,
      fontSize: "1rem",
      color: "#111827",
    },
    studentId: {
      fontSize: "0.8rem",
      color: "#9ca3af",
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas",
    },
    tagRow: {
      display: "flex",
      flexWrap: "wrap",
      gap: "0.25rem",
      marginTop: "0.25rem",
    },
    tag: {
      fontSize: "0.78rem",
      padding: "0.2rem 0.5rem",
      borderRadius: 999,
      backgroundColor: "#eef2ff",
      color: "#4f46e5",
      border: "1px solid rgba(129,140,248,0.4)",
    },
    tagEmpty: {
      fontSize: "0.8rem",
      color: "#9ca3af",
    },
    supportsLabel: {
      fontSize: "0.82rem",
      color: "#6b7280",
      marginTop: "0.35rem",
    },
    checkRow: {
      display: "flex",
      flexWrap: "wrap",
      gap: "0.4rem 0.9rem",
      marginTop: "0.15rem",
    },
    checkLabel: {
      fontSize: "0.82rem",
      color: "#374151",
      display: "flex",
      alignItems: "center",
      gap: "0.3rem",
      cursor: "pointer",
    },
    motorSelect: {
      marginTop: "0.5rem",
      padding: "0.35rem 0.55rem",
      borderRadius: 999,
      border: "1px solid #d1d5db",
      fontSize: "0.82rem",
      backgroundColor: "#ffffff",
      color: "#111827",
    },
    saveRow: {
      marginTop: "0.6rem",
      display: "flex",
      justifyContent: "flex-end",
    },
    saveButton: {
      padding: "0.35rem 0.9rem",
      borderRadius: 999,
      border: "none",
      background:
        "linear-gradient(135deg, #2563eb, #4f46e5, #6366f1)",
      color: "#ffffff",
      fontSize: "0.82rem",
      fontWeight: 600,
      cursor: "pointer",
      boxShadow: "0 8px 18px rgba(37,99,235,0.35)",
    },
    suggestionsText: {
      fontSize: "0.8rem",
      color: "#9ca3af",
      marginTop: "0.25rem",
    },
  };

  return (
    <div style={styles.page}>
      {/* Top bar */}
      <div style={styles.topBar}>
        <div>
          <div style={styles.logoText}>AbleX • Educator Console</div>
        </div>
        <div style={styles.userWrapper}>
          <span style={styles.userLabel}>Signed in</span>
          <UserButton afterSignOutUrl="/" />
        </div>
      </div>

      <main style={styles.mainShell}>
        {/* Hero header */}
        <section
          style={styles.hero}
          onMouseEnter={() =>
            speak(
              "Welcome, Educator. Design inclusive assessments and support every learner."
            )
          }
        >
          <div style={styles.heroChipRow}>
            <span style={styles.chip}>Inclusive Assessment Workspace</span>
          </div>
          <h1 style={styles.heroTitle}>Welcome, Educator 👋</h1>
          <p style={styles.heroSub}>
            Create accessible assessments, track progress, and fine-tune support
            modes for each learner. Your decisions here directly shape safer,
            kinder classrooms.
          </p>
          <div style={styles.heroMetaRow}>
            <span style={styles.metaPill}>Real students • Real supports</span>
            <span style={styles.metaPill}>
              Accessibility-first • Neurodiversity-aware
            </span>
          </div>
        </section>

        {/* Primary navigation cards */}
        <section>
          <div style={styles.cardsRow}>
            {[
              {
                id: "deploy",
                title: "📤 Deploy Assessments",
                desc: "Create, configure, and launch new assessments tailored to your class.",
                badge: "Create & assign",
                onClick: () => navigate("/assessments/create"),
              },
              {
                id: "track",
                title: "📈 Track Student Progress",
                desc: "Explore scores and disability-wise insights to refine support.",
                badge: "Analytics view",
                onClick: () => navigate("/educator/scores"),
              },
            ].map((c) => (
              <article
                key={c.id}
                style={{
                  ...styles.navCard,
                  ...(hoveredCard === c.id ? styles.navCardHover : {}),
                }}
                onMouseEnter={() => {
                  setHoveredCard(c.id);
                  speak(`${c.title}. ${c.desc}`);
                }}
                onMouseLeave={() => setHoveredCard(null)}
                onClick={c.onClick}
              >
                <div>
                  <h2 style={styles.navTitle}>{c.title}</h2>
                  <p style={styles.navDesc}>{c.desc}</p>
                </div>
                <div style={styles.navFooter}>
                  <span style={styles.navBadge}>{c.badge}</span>
                  <span>Click to open ↗</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Student support settings */}
        <section style={styles.studentGridWrapper}>
          <div style={styles.sectionHeader}>
            <h2
              style={styles.sectionTitle}
              onMouseEnter={() => speak("Student support settings")}
            >
              🌟 Student Support Settings
            </h2>
            <span style={styles.sectionHint}>
              Adjust disability supports and motor preferences per learner.
            </span>
          </div>

          <div style={styles.studentGrid}>
            {students.map((s) => {
              const supportsForUser = updatedSupports[s.userId]?.supports || [];
              const motorSelected = supportsForUser.includes("motor");
              const currentMotor =
                updatedSupports[s.userId]?.motorPreference || "None";

              return (
                <div key={s.userId} style={styles.studentCard}>
                  <div style={styles.studentNameRow}>
                    <span style={styles.studentName}>
                      {getDisplayName(s) || s.userId}
                    </span>
                    <span style={styles.studentId}>{s.userId}</span>
                  </div>

                  <div style={styles.tagRow}>
                    {s.supports && s.supports.length > 0 ? (
                      s.supports.map((sup) => (
                        <span key={sup} style={styles.tag}>
                          {sup}
                        </span>
                      ))
                    ) : (
                      <span style={styles.tagEmpty}>No supports assigned yet</span>
                    )}
                  </div>
                  <p style={styles.suggestionsText}>
                    Motor mode: <strong>{currentMotor}</strong>
                  </p>

                  <p style={styles.supportsLabel}>Update supports:</p>
                  <div style={styles.checkRow}>
                    {supportOptions.map((opt) => (
                      <label
                        key={opt}
                        style={styles.checkLabel}
                        onMouseEnter={() => speak(opt)}
                      >
                        <input
                          type="checkbox"
                          checked={supportsForUser.includes(opt)}
                          onChange={() => toggleSupport(s.userId, opt)}
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>

                  {motorSelected && (
                    <select
                      value={updatedSupports[s.userId]?.motorPreference || ""}
                      onChange={(e) => updateMotor(s.userId, e.target.value)}
                      onMouseEnter={() => speak("Select motor preference")}
                      style={styles.motorSelect}
                    >
                      <option value="">Choose motor mode…</option>
                      <option value="braille">Braille</option>
                      <option value="sip-puff">Sip & puff</option>
                      <option value="eye-tracking">Eye tracking</option>
                    </select>
                  )}

                  <div style={styles.saveRow}>
                    <button
                      style={styles.saveButton}
                      onClick={() => handleUpdateSupports(s.userId)}
                      onMouseEnter={() => speak("Save changes")}
                    >
                      Save changes
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
