"use client";
import { useEffect, useState, useRef } from "react";
import {
  FaVideo,
  FaVideoSlash,
  FaMicrophone,
  FaMicrophoneSlash,
  FaExpand,
  FaCompress,
  FaPhoneSlash,
  FaPhone,
} from "react-icons/fa";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import SFUClient from "./SFUClient";
import Video from "./Video";
import "./VideoCall.css";

const API_BASE_URL = `${import.meta.env.VITE_SERVER_URL}/video-call`;

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
      API_BASE_URL,
      userId,
      (streamInfo) => {
        setRemoteStreams((prev) => {
          const existingStream = prev.find(
            (s) => s.consumerId === streamInfo.consumerId
          );
          if (existingStream) {
            return prev.map((s) =>
              s.consumerId === streamInfo.consumerId
                ? {
                    ...s,
                    micEnabled:
                      streamInfo.micEnabled !== undefined
                        ? streamInfo.micEnabled
                        : s.micEnabled,
                    cameraEnabled:
                      streamInfo.cameraEnabled !== undefined
                        ? streamInfo.cameraEnabled
                        : s.cameraEnabled,
                  }
                : s
            );
          }
          return [
            ...prev,
            {
              stream: streamInfo.stream,
              username: streamInfo.username || "Unknown",
              consumerId: streamInfo.consumerId || "",
              micEnabled:
                streamInfo.micEnabled !== undefined
                  ? streamInfo.micEnabled
                  : true,
              cameraEnabled:
                streamInfo.cameraEnabled !== undefined
                  ? streamInfo.cameraEnabled
                  : true,
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
        if (localVideoRef.current && localStream) {
          localVideoRef.current.srcObject = localStream;
          localVideoRef.current
            .play()
            .catch((e) => console.error("Lỗi phát video local:", e));
        } else {
          console.error("Không tìm thấy video element hoặc stream");
          console.log("Local Video element:", localVideoRef.current);
          console.log("Local Stream:", localStream);
        }
      }
    };
    connectAndJoin();

    return () => {
      console.log("Cleaning up VideoCall");
      if (sfuClientRef.current) {
        sfuClientRef.current.close();
        sfuClientRef.current = null;
      }
      if (localStream) {
        localStream.getTracks().forEach((track) => {
          console.log(
            `Stopping track in cleanup: ${track.kind}, id: ${track.id}, enabled: ${track.enabled}`
          );
          track.stop();
          track.enabled = false;
        });
      }
      setLocalStream(null);
    };
  }, [userId, roomId]);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      console.log(
        "Attempting to attach localStream to video element:",
        localVideoRef.current
      );
      console.log("Local stream object:", localStream);
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current
        .play()
        .catch((e) => console.error("Local video play error:", e));
    } else {
      console.log(
        "Cannot attach stream. Ref available:",
        !!localVideoRef.current,
        "Stream available:",
        !!localStream
      );
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
    }
  }, [localStream]);

  useEffect(() => {
    const draggable = document.getElementById("draggable-video");
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;

    const startDragging = (e) => {
      initialX = e.clientX - currentX;
      initialY = e.clientY - currentY;
      isDragging = true;
    };

    const stopDragging = () => {
      isDragging = false;
    };

    const drag = (e) => {
      if (isDragging) {
        e.preventDefault();
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;
        draggable.style.left = `${currentX}px`;
        draggable.style.top = `${currentY}px`;
        draggable.style.right = "auto";
      }
    };

    if (draggable) {
      currentX = 20;
      currentY = 40;
      draggable.style.left = `${currentX}px`;
      draggable.style.top = `${currentY}px`;

      draggable.addEventListener("mousedown", startDragging);
      document.addEventListener("mouseup", stopDragging);
      document.addEventListener("mousemove", drag);

      draggable.addEventListener("touchstart", (e) => {
        const touch = e.touches[0];
        initialX = touch.clientX - currentX;
        initialY = touch.clientY - currentY;
        isDragging = true;
      });
      document.addEventListener("touchend", stopDragging);
      document.addEventListener("touchmove", (e) => {
        if (isDragging) {
          e.preventDefault();
          const touch = e.touches[0];
          currentX = touch.clientX - initialX;
          currentY = touch.clientY - initialY;
          draggable.style.left = `${currentX}px`;
          draggable.style.top = `${currentY}px`;
          draggable.style.right = "auto";
        }
      });
    }

    return () => {
      if (draggable) {
        draggable.removeEventListener("mousedown", startDragging);
        document.removeEventListener("mouseup", stopDragging);
        document.removeEventListener("mousemove", drag);
      }
    };
  }, [localStream]);

  const participantCount = remoteStreams.length + (localStream ? 1 : 0);

  const toggleMic = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicEnabled(audioTrack.enabled);
        sfuClientRef.current.notifyStatusUpdate({ audioEnabled: audioTrack.enabled });
        // toast(audioTrack.enabled ? "Micro đã bật" : "Micro đã tắt", {
        //   type: audioTrack.enabled ? "success" : "warning",
        //   autoClose: 2000,
        // });
      } else {
        console.warn("No audio track found to toggle.");
      }
    }
  };

  const toggleCamera = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setCameraEnabled(videoTrack.enabled);
        sfuClientRef.current.notifyStatusUpdate({ videoEnabled: videoTrack.enabled });
        // toast(videoTrack.enabled ? "Camera đã bật" : "Camera đã tắt", {
        //   type: videoTrack.enabled ? "success" : "warning",
        //   autoClose: 2000,
        // });
      } else {
        console.warn("No video track found to toggle.");
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

  const handleLeaveCall = () => {
    console.log(`Leaving call for user ${userId} in room ${roomId}`);
    if (sfuClientRef.current) {
      sfuClientRef.current.close();
      sfuClientRef.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        console.log(
          `Stopping track in handleLeaveCall: ${track.kind}, id: ${track.id}, enabled: ${track.enabled}`
        );
        track.stop();
        track.enabled = false;
      });
    }
    setLocalStream(null);
    toast.info("You have left the call.");
    onClose();
  };

  useEffect(() => {
    if (localVideoRef.current) {
      console.log("Stream được gắn:", localVideoRef.current.srcObject);
      console.log("Trạng thái video:", localVideoRef.current.readyState);
    }
  }, [localVideoRef]);

  return (
    <div className="video-call-container">
      <div className="video-call-header">
        <h2>Video Call ({participantCount} participants)</h2>
      </div>
      <div className={`video-layout participant-count-${participantCount}`}>
        <div className="remote-streams-grid">
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
        {localStream && (
          <div className="local-video-wrapper" id="draggable-video">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="local-video-element"
            />
            <div className="video-info">
              <span className="username">Bạn</span>
              <div className="status-icons">
                <span className={`icon ${micEnabled ? "mic-on" : "mic-off"}`}>
                  {micEnabled ? <FaMicrophone /> : <FaMicrophoneSlash />}
                </span>
                <span
                  className={`icon ${cameraEnabled ? "camera-on" : "camera-off"}`}
                >
                  {cameraEnabled ? <FaVideo /> : <FaVideoSlash />}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="controls">
        <button
          onClick={toggleMic}
          className={micEnabled ? "control-btn" : "control-btn off"}
        >
          {micEnabled ? <FaMicrophone /> : <FaMicrophoneSlash />}
        </button>
        <button
          onClick={toggleCamera}
          className={cameraEnabled ? "control-btn" : "control-btn off"}
        >
          {cameraEnabled ? <FaVideo /> : <FaVideoSlash />}
        </button>
        <button onClick={toggleFullScreen} className="control-btn">
          {document.fullscreenElement ? <FaCompress /> : <FaExpand />}
        </button>
        <button onClick={handleLeaveCall} className="control-btn leave">
          <FaPhone />
        </button>
      </div>
    </div>
  );
}