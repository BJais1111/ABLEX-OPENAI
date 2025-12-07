import React from "react";

export default function TimerSelector({ value, onChange }) {
  const handleChange = (e) => {
    onChange(parseInt(e.target.value));
  };

  return (
    <div style={{ marginBottom: "2rem" }}>
      <label style={{ fontSize: "1.1rem", fontWeight: 600 }}>
        ⏱️ Select Assessment Duration:
      </label>
      <select
        value={value}
        onChange={handleChange}
        style={{
          marginTop: "0.5rem",
          padding: "0.6rem 1rem",
          borderRadius: "8px",
          border: "1px solid #ccc",
          fontSize: "1rem",
        }}
      >
        <option value={5}>5 minutes</option>
        <option value={10}>10 minutes</option>
        <option value={15}>15 minutes</option>
        <option value={20}>20 minutes</option>
        <option value={30}>30 minutes</option>
      </select>
    </div>
  );
}
