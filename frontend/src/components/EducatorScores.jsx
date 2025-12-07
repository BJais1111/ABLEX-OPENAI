// src/components/EducatorScores.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

export default function EducatorScores() {
  const [scores, setScores] = useState([]);
  const [scoreChartData, setScoreChartData] = useState([]);
  const [timeChartData, setTimeChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchScores = async () => {
      try {
        const res = await axios.get("http://localhost:5000/scores/all");
        setScores(res.data);

        const scoreMap = {};
        const timeMap = {};

        res.data.forEach(s => {
          const percentage = (s.score / s.total) * 100;
          const timeTaken = s.startedAt && s.submittedAt
            ? (new Date(s.submittedAt) - new Date(s.startedAt)) / 1000
            : null;

          (s.supports || []).forEach(disability => {
            if (!scoreMap[disability])
              scoreMap[disability] = { support: disability, total: 0, count: 0 };
            scoreMap[disability].total += percentage;
            scoreMap[disability].count += 1;

            if (timeTaken != null) {
              if (!timeMap[disability])
                timeMap[disability] = { support: disability, total: 0, count: 0 };
              timeMap[disability].total += timeTaken;
              timeMap[disability].count += 1;
            }
          });
        });

        setScoreChartData(Object.values(scoreMap).map(d => ({
          support: d.support,
          avgScore: parseFloat((d.total / d.count).toFixed(2)),
        })));

        setTimeChartData(Object.values(timeMap).map(d => ({
          support: d.support,
          avgTimeMinutes: parseFloat((d.total / d.count / 60).toFixed(2)),
        })));
      } catch (err) {
        console.error("❌ Error fetching scores:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchScores();
  }, []);

  if (loading) return <p style={{ padding: "2rem" }}>Loading student scores...</p>;
  if (!scores.length) return <p style={{ padding: "2rem" }}>No scores submitted yet.</p>;

  return (
    <div style={styles.page}>
      <div style={styles.shell}>
        <h2 style={styles.heading}>
          <span style={styles.headingGradient}>📊 Student Assessment Results</span>
        </h2>

        {/* Score Table */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitle}>All Submissions</h3>
          </div>
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Disability Support</th>
                  <th style={styles.th}>Score</th>
                  <th style={styles.th}>Assessment ID</th>
                </tr>
              </thead>
              <tbody>
                {scores.map((s, i) => (
                  <tr key={i} style={i % 2 === 0 ? styles.rowEven : styles.rowOdd}>
                    <td style={styles.td}>{s.name || s.userId}</td>
                    <td style={styles.td}>{s.supports?.join(", ") || "None"}</td>
                    <td style={styles.td}><strong>{`${s.score} / ${s.total}`}</strong></td>
                    <td style={{ ...styles.td, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                      {s.assessmentId || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Chart 1: Avg Score % */}
        <h3 style={styles.sectionTitle}>📈 Avg Score % by Disability</h3>
        <div style={styles.card}>
          <div style={{ height: 320, padding: "0 .5rem 1rem" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scoreChartData} margin={{ top: 12, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid stroke="#e9eef5" />
                <XAxis dataKey="support" tick={{ fill: "#64748b" }} axisLine={{ stroke: "#d1d5db" }} />
                <YAxis domain={[0, 100]} tick={{ fill: "#64748b" }} axisLine={{ stroke: "#d1d5db" }} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  itemStyle={{ color: "#334155" }}
                  labelStyle={{ color: "#0f172a", fontWeight: 600 }}
                />
                <Legend wrapperStyle={{ color: "#64748b" }} />
                <Bar dataKey="avgScore" fill="#C4B5FD" stroke="#A78BFA" name="Avg % Score" radius={[10,10,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Avg Time Taken */}
        <h3 style={styles.sectionTitle}>⏱ Avg Time Taken (min) by Disability</h3>
        <div style={styles.card}>
          <div style={{ height: 320, padding: "0 .5rem 1rem" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeChartData} margin={{ top: 12, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid stroke="#e9eef5" />
                <XAxis dataKey="support" tick={{ fill: "#64748b" }} axisLine={{ stroke: "#d1d5db" }} />
                <YAxis tick={{ fill: "#64748b" }} axisLine={{ stroke: "#d1d5db" }} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  itemStyle={{ color: "#334155" }}
                  labelStyle={{ color: "#0f172a", fontWeight: 600 }}
                />
                <Legend wrapperStyle={{ color: "#64748b" }} />
                <Bar dataKey="avgTimeMinutes" fill="#A7F3D0" stroke="#34D399" name="Avg Time (min)" radius={[10,10,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- pastel styles ---------------- */

const tooltipStyle = {
  background: "rgba(255,255,255,0.92)",
  border: "1px solid rgba(148,163,184,0.25)",
  borderRadius: 12,
  boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
};

const styles = {
  page: {
    minHeight: "100vh",
    padding: "3rem 1.25rem",
    background: "linear-gradient(135deg, #E6F7FF 0%, #F7F1FF 100%)",
    fontFamily: "'Poppins', system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    color: "#1f2937",
  },
  shell: {
    maxWidth: 1100,
    margin: "0 auto",
  },
  heading: {
    margin: "0 0 1.25rem 0",
  },
  headingGradient: {
    fontSize: "2rem",
    fontWeight: 800,
    background: "linear-gradient(90deg, #60A5FA 0%, #A78BFA 40%, #F472B6 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  sectionTitle: {
    margin: "2rem 0 .75rem",
    fontSize: "1.25rem",
    color: "#334155",
    fontWeight: 700,
  },
  card: {
    background: "rgba(255,255,255,0.65)",
    border: "1px solid rgba(255,255,255,0.6)",
    borderRadius: 20,
    boxShadow: "0 10px 30px rgba(31,41,55,0.08)",
    backdropFilter: "blur(6px)",
    overflow: "hidden",
  },
  cardHeader: {
    padding: "1rem 1.25rem",
    borderBottom: "1px solid rgba(226,232,240,0.8)",
    background: "linear-gradient(90deg, rgba(236,253,245,0.6), rgba(238,242,255,0.6))",
  },
  cardTitle: {
    margin: 0,
    fontSize: "1.1rem",
    fontWeight: 700,
    color: "#334155",
  },
  tableWrapper: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "separate",
    borderSpacing: 0,
    fontSize: "0.98rem",
  },
  th: {
    textAlign: "left",
    padding: "12px 16px",
    color: "#475569",
    background: "rgba(248,250,252,0.85)",
    position: "sticky",
    top: 0,
    borderBottom: "1px solid rgba(226,232,240,0.9)",
  },
  td: {
    padding: "12px 16px",
    color: "#334155",
    verticalAlign: "top",
    borderBottom: "1px solid rgba(241,245,249,0.9)",
  },
  rowEven: {
    background: "rgba(255,255,255,0.65)",
  },
  rowOdd: {
    background: "rgba(250,250,255,0.55)",
  },
};
