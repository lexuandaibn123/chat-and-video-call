"use client";
import { useEffect, useState, useRef } from "react";
import SFUClient from "./SFUClient";
import Hark from "./Hark";
import "./VideoCall.css"

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
        const stream = streamInfo.stream;
        console.log("Remote stream received:", stream);
        console.log("Video tracks:", stream.getVideoTracks());
        console.log("Audio tracks:", stream.getAudioTracks());

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
          localVideoRef.current
            .play()
            .catch((e) => console.error("Local video play failed:", e));
        }
      }
      console.log("Local stream:", localStream);
      console.log("Local video tracks:", localStream?.getVideoTracks());
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
  }, [userId, roomId, micEnabled, cameraEnabled]);

  const participantCount = remoteStreams.length + (localStream ? 1 : 0);

  const toggleMic = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicEnabled(audioTrack.enabled);
        remoteStreams.forEach((streamInfo) => {
          streamInfo.micEnabled = audioTrack.enabled;
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
        remoteStreams.forEach((streamInfo) => {
          streamInfo.cameraEnabled = videoTrack.enabled;
        });
      }
    }
  };

  return (
    <div className="video-call-container">
      <h2>Cuộc gọi video ({participantCount} người tham gia)</h2>
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
                  {micEnabled ? "🎤" : "🔇"}
                </span>
                <span className={`icon ${cameraEnabled ? "camera-on" : "camera-off"}`}>
                  {cameraEnabled ? "📷" : "📷"}
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

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      console.log("Setting srcObject for video:", stream);
      videoRef.current.autoplay = true;
      videoRef.current
        .play()
        .catch((e) => console.error("Remote video play failed:", e));
      const videoTracks = stream.getVideoTracks();
      if (videoTracks.length === 0) {
        console.warn(`No video tracks found in stream for ${username}`);
      } else {
        console.log(
          `Attaching stream with video tracks for ${username}:`,
          videoTracks
        );
      }

      if (stream.getAudioTracks().length > 0) {
        if (harkRef.current) {
          harkRef.current.stop();
        }
        harkRef.current = new Hark(stream, { threshold: -60 });
        harkRef.current.on("stopped_speaking", () => {
          if (videoRef.current) {
            videoRef.current.classList.remove("border-green-500");
          }
        });
        harkRef.current.on("speaking", () => {
          if (videoRef.current) {
            videoRef.current.classList.add("border-green-500");
          }
        });
        harkRef.current.on("volume_change", (volume) => {
          // console.log(`Mức âm lượng của ${username}: ${volume}`);
        });
      } else {
        console.warn(`No audio tracks found in remote stream for ${username}`);
      }
    }
    return () => {
      if (harkRef.current) {
        harkRef.current.stop();
        harkRef.current = null;
      }
    };
  }, [stream, username]);

  return (
    <div className="video-wrapper">
      <video ref={videoRef} autoPlay playsInline className="video-element" />
      <div className="video-info">
        <span className="username">{username}</span>
        <div className="status-icons">
          <span className={`icon ${micEnabled ? "mic-on" : "mic-off"}`}>
            {micEnabled ? "🎤" : "🔇"}
          </span>
          <span className={`icon ${cameraEnabled ? "camera-on" : "camera-off"}`}>
            {cameraEnabled ? "📷" : "📷"}
          </span>
        </div>
      </div>
    </div>
  );
}