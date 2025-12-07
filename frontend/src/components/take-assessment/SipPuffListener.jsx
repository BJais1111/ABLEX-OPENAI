import { useEffect, useState } from "react";

export default function SipPuffListener({ onSip, onPuff }) {
  const [connected, setConnected] = useState(false);

  const connectSerial = async () => {
    if (!("serial" in navigator)) {
      console.error("❌ Serial API not supported in this browser.");
      return;
    }
  
    try {
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: 9600 });
      console.log("✅ Serial port opened");
  
      const decoder = new TextDecoderStream();
      const inputDone = port.readable.pipeTo(decoder.writable);
      const inputStream = decoder.readable;
      const reader = inputStream.getReader();
  
      setConnected(true);
  
      let buffer = ""; // Keep this for line splitting
  
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          buffer += value; // ✅ No decoding needed here!
          let lines = buffer.split("\n");
          buffer = lines.pop(); // Keep the incomplete line
  
          for (const lineRaw of lines) {
            const line = lineRaw.trim().toLowerCase();
            console.log(`📡 Received: ${line}`);
  
            if (line.includes("sip detected")) {
              console.log("🫧 Sip detected!");
              onSip();
            } else if (line.includes("puff detected")) {
              console.log("💨 Puff detected!");
              onPuff();
            }
            
          }
        }
      }
  
      reader.releaseLock();
    } catch (err) {
      console.error("❌ Serial Error:", err);
    }
  };
  
  return (
    <div style={{ marginTop: "1rem" }}>
      {!connected && (
        <button
          style={{
            padding: "10px 20px",
            fontSize: "1.1rem",
            backgroundColor: "#4f46e5",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
          }}
          onClick={connectSerial}
        >
          Connect Sip-and-Puff Device
        </button>
      )}
      {connected && <p style={{ color: "green" }}>✅ Device Connected!</p>}
    </div>
  );
}
