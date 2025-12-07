// src/EyeTrackingListener.jsx
import React, { useEffect, useRef, useState } from "react";
import { FaceMesh } from "@mediapipe/face_mesh";
import { Camera } from "@mediapipe/camera_utils";

export default function EyeTrackingListener({ onBlink, onLongClose }) {
  const videoRef = useRef(null);
  const onBlinkRef = useRef(onBlink);
  const onLongCloseRef = useRef(onLongClose);
  const [status, setStatus] = useState("");

  // keep refs in sync with latest props
  useEffect(() => {
    onBlinkRef.current = onBlink;
    onLongCloseRef.current = onLongClose;
  }, [onBlink, onLongClose]);

  useEffect(() => {
    const faceMesh = new FaceMesh({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4/${file}`,
    });
    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    const LEFT = [33, 160, 158, 133, 153, 144];
    const RIGHT = [362, 385, 387, 263, 373, 380];
    const EAR_THRESHOLD = 0.2;
    const LONG_CLOSE_DURATION = 3.0;
    let eyeState = "open";
    let eyeClosedStart = 0;

    const calcEAR = (idxs, lm) => {
      if (!lm || idxs.some(i => !lm[i])) return 0; // <- added safety
      const d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
      return (
        (d(lm[idxs[1]], lm[idxs[5]]) + d(lm[idxs[2]], lm[idxs[4]])) /
        (2 * d(lm[idxs[0]], lm[idxs[3]]))
      );
    };

    faceMesh.onResults((results) => {
      if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) return;
      const lm = results.multiFaceLandmarks[0];
      if (!lm || lm.length < 381) return; // <- added check for enough landmarks

      const now = performance.now() / 1000;
      const avg =
        (calcEAR(LEFT, lm) + calcEAR(RIGHT, lm)) / 2;

      if (avg < EAR_THRESHOLD) {
        if (eyeState === "open") {
          eyeClosedStart = now;
          eyeState = "closed";
        } else if (now - eyeClosedStart >= LONG_CLOSE_DURATION) {
          setStatus("LONG_CLOSE");
          onLongCloseRef.current();
          eyeClosedStart = now + 2; // debounce
        }
      } else {
        if (
          eyeState === "closed" &&
          now - eyeClosedStart < LONG_CLOSE_DURATION
        ) {
          setStatus("BLINK");
          onBlinkRef.current();
        }
        eyeState = "open";
      }
    });

    const camera = new Camera(videoRef.current, {
      onFrame: () => faceMesh.send({ image: videoRef.current }),
      width: 320,
      height: 240,
    });
    camera.start();

    return () => {
      camera.stop();
      faceMesh.close();
    };
  }, []); // <- run once on mount

  // Clear the little badge after 0.8s
  useEffect(() => {
    if (!status) return;
    const t = setTimeout(() => setStatus(""), 800);
    return () => clearTimeout(t);
  }, [status]);

  return (
    <div style={{
      position: "absolute",
      bottom: 16,
      right: 16,
      zIndex: 10,
    }}>
      <video
        ref={videoRef}
        style={{
          width: 160,
          height: 120,
          border: "2px solid #333",
          borderRadius: 4,
        }}
        autoPlay
        muted
      />
      {status && (
        <div style={{
          position: "absolute",
          top: 4,
          left: 4,
          padding: "2px 6px",
          background: status === "BLINK"
            ? "rgba(0,255,0,0.7)"
            : "rgba(255,0,0,0.7)",
          color: "#fff",
          fontWeight: "bold",
          borderRadius: 4,
          fontSize: 12,
        }}>
          {status}
        </div>
      )}
    </div>
  );
}
