// src/components/take-assessment/features/BrailleSpeaker.jsx
import React, { useEffect, useRef, useState } from "react";

// ——— full Bharati‐Braille map ———
const letterToDots = {
  a: [1], b: [1,2], c: [1,4], d: [1,4,5], e: [1,5],
  f: [1,2,4], g: [1,2,4,5], h: [1,2,5], i: [2,4],  j: [2,4,5],
  k: [1,3], l: [1,2,3], m: [1,3,4], n: [1,3,4,5], o: [1,3,5],
  p: [1,2,3,4], q: [1,2,3,4,5], r: [1,2,3,5], s: [2,3,4],
  t: [2,3,4,5], u: [1,3,6], v: [1,2,3,6], w: [2,4,5,6],
  x: [1,3,4,6], y: [1,3,4,5,6], z: [1,3,5,6],
  "1": [1], "2": [1,2], "3": [1,4], "4": [1,4,5], "5": [1,5],
  "6": [1,2,4], "7": [1,2,4,5], "8": [1,2,5], "9": [2,4], "0": [2,4,5],
  " ": [], ".": [2,5,6], ",": [2], "?":[1,4,6], "!":[2,3,5],

  // Hindi + Kannada (unchanged)
  "अ":[1], "आ":[1,2], "इ":[1,4], "ई":[1,4,5],
  "उ":[1,5], "ऊ":[1,2,4], "ए":[1,5,6], "ऐ":[1,2,5,6],
  "ओ":[2,4,6], "औ":[1,2,4,5,6],
  "क":[1,3], "ख":[1,3,4], "ग":[1,3,4,5], "घ":[1,3,5],
  "च":[2,3,4], "छ":[2,3,4,5], "ज":[2,3,5], "झ":[2,3,5,6],
  "ट":[1,2,3], "ठ":[1,2,3,4], "ड":[1,2,4,6], "ढ":[1,2,4,5,6],
  "त":[2,3,6], "थ":[2,3,4,6], "द":[1,2,3,5], "ध":[1,2,3,5,6],
  "ನ":[1,4],
};

export default function BrailleSpeaker({ question = "", options = [] }) {
  const [connected, setConnected] = useState(false);
  const portRef = useRef(null);
  const writerRef = useRef(null);

  const delay = (ms) => new Promise((res) => setTimeout(res, ms));

  const handleConnect = async () => {
    try {
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: 9600 });
      await delay(2000);
      writerRef.current = port.writable.getWriter();
      portRef.current = port;
      setConnected(true);
      console.log("✅ Connected to Braille device");
    } catch (err) {
      console.error("❌ Connection error:", err);
    }
  };

  useEffect(() => {
    if (!connected || !writerRef.current) return;

    const sendBraille = async () => {
      const writer = writerRef.current;

      // LONG word buzz (600 ms)
      const vibrateWord = async () => {
        const cmd = new Uint8Array([0xff, 600]);
        await writer.write(cmd);
        await delay(700); // cooldown
      };

      // VERY SLOW letter output (850ms delay per letter)
      const sendChar = async (ch) => {
        const dots = letterToDots[ch] || [];
        const cmd = new Uint8Array([dots.length, ...dots]);

        if (dots.length) {
          console.log("→ sendChar:", ch, dots);
          await writer.write(cmd);
          await delay(850); // SUPER slow pacing
        } else {
          // space = small pause
          await delay(400);
        }
      };

      // PROCESS QUESTION
      console.log("⏩ Slow QUESTION:");
      const qWords = question.split(/\s+/).filter(Boolean);

      for (const word of qWords) {
        for (const ch of word) {
          await sendChar(ch); // slow letter-by-letter
        }
        await vibrateWord(); // long buzz after each word
      }

      await delay(1000);

      // PROCESS OPTIONS
      console.log("⏩ Slow OPTIONS:");
      const labels = ["a", "b", "c", "d"];

      for (let i = 0; i < options.length; i++) {
        const opt = options[i];

        // Option label a/b/c/d
        const dot = letterToDots[labels[i]][0];
        await writer.write(new Uint8Array([1, dot]));
        await delay(600);

        const oWords = opt.split(/\s+/).filter(Boolean);
        for (const word of oWords) {
          for (const ch of word) {
            await sendChar(ch);
          }
          await vibrateWord(); // long buzz after each word
        }

        await delay(800);
      }
    };

    sendBraille();
  }, [connected, question, options]);

  return (
    <>
      {!connected && (
        <button onClick={handleConnect}>
          🔌 Connect Braille Output
        </button>
      )}
    </>
  );
}
