"use client";
import { useEffect, useState, useRef } from "react";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import SFUClient from "./SFUClient";
import Hark from "./Hark";
import "./VideoCall.css";

export default function VideoCall({ userId, roomId, onClose }) {
  const sfuClientRef = useRef(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState([]);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [hasJoined, setHasJoined] = useState(false);
  const localVideoRef = useRef(null);

  useEffect(() => {
    if (!userId || !roomId) {
      console.error("Missing userId or roomId");
      return;
    }

    const sfuClient = new SFUClient(
      "http://localhost:8080/video-call",
      userId,
      (streamInfo) => {
        setRemoteStreams((prev) => {
          if (prev.some((s) => s.consumerId === streamInfo.consumerId))
            return prev;
          return [
            ...prev,
            {
              stream: streamInfo.stream,
              username: streamInfo.username || "Unknown",
              consumerId: streamInfo.consumerId || "",
              micEnabled: true,
              cameraEnabled: true,
            },
          ];
        });
      },
      (consumerId) => {
        setRemoteStreams((prev) =>
          prev.filter((s) => s.consumerId !== consumerId)
        );
      }
    );
    sfuClientRef.current = sfuClient;

    const connectAndJoin = async () => {
      await sfuClient.connect(roomId);
      const localStream = sfuClient.getLocalStream();
      if (localStream) {
        setLocalStream(localStream);
        localStream.getAudioTracks().forEach((track) => {
          track.enabled = micEnabled;
        });
        localStream.getVideoTracks().forEach((track) => {
          track.enabled = cameraEnabled;
        });
        setHasJoined(true);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream;
          localVideoRef.current.play().catch((e) => console.error("Local video play failed:", e));
        }
      }
    };
    connectAndJoin();

    return () => {
      if (sfuClientRef.current) {
        sfuClientRef.current = null;
      }
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [userId, roomId]);

  const participantCount = remoteStreams.length + (localStream ? 1 : 0);

  const toggleMic = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicEnabled(audioTrack.enabled);
        sfuClientRef.current.toggleMic();
        toast(audioTrack.enabled ? "Micro đã bật" : "Micro đã tắt", {
          type: audioTrack.enabled ? "success" : "warning",
          autoClose: 2000,
        });
      }
    }
  };

  const toggleCamera = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setCameraEnabled(videoTrack.enabled);
        sfuClientRef.current.toggleCamera();
        toast(videoTrack.enabled ? "Camera đã bật" : "Camera đã tắt", {
          type: videoTrack.enabled ? "success" : "warning",
          autoClose: 2000,
        });
      }
    }
  };

  const toggleFullScreen = () => {
    const container = document.querySelector(".video-call-container");
    if (!document.fullscreenElement) {
      container.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div className="video-call-container">
      <div className="video-call-header">
        {/* <img src="/logo.png" alt="Logo" className="logo" /> */}
        <h2>Cuộc gọi video ({participantCount} người tham gia)</h2>
      </div>
      <div className={`video-grid participant-count-${participantCount}`}>
        {localStream && (
          <div className="video-wrapper">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              className="video-element"
            />
            <div className="video-info">
              <span className="username">Bạn</span>
              <div className="status-icons">
                <span className={`icon ${micEnabled ? "mic-on" : "mic-off"}`}>
                  {micEnabled ? "🎙️" : "🔇"}
                </span>
                <span className={`icon ${cameraEnabled ? "camera-on" : "camera-off"}`}>
                  {cameraEnabled ? "📹" : "📷"}
                </span>
              </div>
            </div>
          </div>
        )}
        {remoteStreams.map((streamInfo) => (
          <Video
            key={streamInfo.consumerId}
            stream={streamInfo.stream}
            username={streamInfo.username}
            micEnabled={streamInfo.micEnabled}
            cameraEnabled={streamInfo.cameraEnabled}
          />
        ))}
      </div>
      <div className="controls">
        <button
          onClick={toggleMic}
          className={micEnabled ? "control-btn" : "control-btn off"}
        >
          {micEnabled ? "Tắt Mic" : "Bật Mic"}
        </button>
        <button
          onClick={toggleCamera}
          className={cameraEnabled ? "control-btn" : "control-btn off"}
        >
          {cameraEnabled ? "Tắt Camera" : "Bật Camera"}
        </button>
        {/* <button
          onClick={() => sfuClientRef.current.shareScreen()}
          className="control-btn"
        >
          Chia sẻ màn hình
        </button> */}
        <button
          onClick={toggleFullScreen}
          className="control-btn"
        >
          {document.fullscreenElement ? "Thoát toàn màn hình" : "Toàn màn hình"}
        </button>
        <button
          onClick={onClose}
          className="control-btn leave"
        >
          Rời cuộc gọi
        </button>
      </div>
    </div>
  );
}

function Video({ stream, username, micEnabled, cameraEnabled }) {
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
            {micEnabled ? "🎙️" : "🔇"}
          </span>
          <span className={`icon ${cameraEnabled ? "camera-on" : "camera-off"}`}>
            {cameraEnabled ? "📹" : "📷"}
          </span>
        </div>
      </div>
    </div>
  );
}