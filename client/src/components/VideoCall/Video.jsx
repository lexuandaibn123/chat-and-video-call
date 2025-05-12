"use client";
import { useEffect, useState, useRef } from "react";
import { FaVideo, FaVideoSlash, FaMicrophone, FaMicrophoneSlash } from "react-icons/fa";
import 'react-toastify/dist/ReactToastify.css';
import Hark from "./Hark";
import "./VideoCall.css";

export default function Video({ stream, username, micEnabled, cameraEnabled }) {
  const videoRef = useRef(null);
  const harkRef = useRef(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch((e) => console.error("Remote video play failed:", e));
    }

    if (stream.getAudioTracks().length > 0) {
      const hark = new Hark(stream, { threshold: -50, smoothing: 0.2 });
      hark.on("speaking", () => {
        setIsSpeaking(true);
        videoRef.current.classList.add("speaking");
      });
      hark.on("stopped_speaking", () => {
        setIsSpeaking(false);
        videoRef.current.classList.remove("speaking");
      });
      harkRef.current = hark;
    }

    return () => {
      if (harkRef.current) {
        harkRef.current.stop();
      }
    };
  }, [stream]);

  return (
    <div className="video-wrapper">
      <video ref={videoRef} autoPlay playsInline className="video-element" />
      <div className="video-info">
        <span className="username">{username}</span>
        {isSpeaking && <span className="sound-wave">🔊</span>}
        <div className="status-icons">
          <span className={`icon ${micEnabled ? "mic-on" : "mic-off"}`}>
            {micEnabled ? <FaMicrophone /> : <FaMicrophoneSlash />}
          </span>
          <span className={`icon ${cameraEnabled ? "camera-on" : "camera-off"}`}>
            {cameraEnabled ? <FaVideo /> : <FaVideoSlash />}
          </span>
        </div>
      </div>
    </div>
  );
}