"use client";
import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { SFUClient } from "./SFUClient";
import { Hark } from "./Hark";

export default function VideoCall() {
  const [isLogined, setIsLogined] = useState(false);

  const [roomId, setRoomId] = useState("");
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const sfuClientRef = useRef<SFUClient | null>(null);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  const [remoteStreams, setRemoteStreams] = useState<
    Array<{ stream: MediaStream; username: string; consumerId: string }>
  >([]);

  // **1. Xử lý login**
  const handleLogin = async () => {
    try {
      const { data, status } = await axios.post(
        "http://localhost:8080/api/auth/login",
        { email, password },
        { withCredentials: true }
      );
      if (status === 200) {
        setIsLogined(true);
        setUserId(data.userInfo.id);
      }
    } catch (err) {
      console.error("[Login] failed:", err);
    }
  };

  // **2. Khởi tạo Socket.IO**
  useEffect(() => {
    if (!isLogined || !userId) return;

    const sfuClient = new SFUClient(
      "http://localhost:8080/video-call",
      userId,
      (streamInfo) => {
        const stream = streamInfo.stream;
        // Kiểm tra các track trong stream từ xa
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
              username: streamInfo.username,
              consumerId: streamInfo.consumerId || "",
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

    return () => {
      if (sfuClientRef.current) {
        sfuClientRef.current = null;
      }
    };
  }, [isLogined, userId]);

  const joinRoom = async () => {
    if (sfuClientRef.current) {
      setRemoteStreams([]);
      await sfuClientRef.current.connect(roomId);
      const localStream = sfuClientRef.current.getLocalStream();
      setLocalStream(localStream);
      console.log("Local stream:", localStream);
      console.log("Local video tracks:", localStream?.getVideoTracks());
    }
  };

  return (
    <div className="p-4">
      {!isLogined ? (
        <div className="max-w-sm mx-auto">
          <input
            type="text"
            placeholder="Email"
            className="border p-2 w-full mb-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            className="border p-2 w-full mb-4"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            onClick={handleLogin}
            className="bg-blue-500 text-white px-4 py-2 rounded w-full"
          >
            Login
          </button>
        </div>
      ) : (
        <>
          <h1 className="text-2xl font-bold mb-4">Group Video Call</h1>
          <div className="mb-4 flex items-center">
            <input
              type="text"
              placeholder="Enter room ID"
              className="border p-2 mr-2 flex-1"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
            />
            <button
              onClick={joinRoom}
              className="bg-green-500 text-white px-4 py-2 rounded"
            >
              Join Room
            </button>
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="p-4">
              <h1 className="text-2xl font-bold mb-4">
                Video Call - Room: {roomId}
              </h1>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Video
                  stream={localStream as MediaStream}
                  username="You"
                  isLocalStream={true}
                />
                {remoteStreams.map((streamInfo) => (
                  <Video
                    key={streamInfo.consumerId}
                    stream={streamInfo.stream}
                    username={streamInfo.username}
                    isLocalStream={false}
                  />
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const Video: React.FC<{
  stream: MediaStream;
  username: string;
  isLocalStream: boolean;
}> = ({ stream, username, isLocalStream }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const harkRef = useRef<Hark | null>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.autoplay = true;

      if (isLocalStream) {
        videoRef.current.volume = 0.0;
        videoRef.current.muted = true;
      } else {
        videoRef.current.volume = 1.0;
        videoRef.current.muted = false;
      }

      videoRef.current
        .play()
        .catch((e) => console.error("Playback failed:", e));
      const videoTracks = stream.getVideoTracks();
      if (videoTracks.length === 0) {
        console.warn(`No video tracks found in stream for ${username}`);
      } else {
        console.log(
          `Attaching stream with video tracks for ${username}:`,
          videoTracks
        );
      }

      if (!isLocalStream) {
        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length > 0) {
          if (harkRef.current) {
            harkRef.current.stop();
          }
          harkRef.current = new Hark(stream, { threshold: -60 });
          harkRef.current.on("stopped_speaking", () => {
            videoRef.current?.classList.remove("border-green-500");
          });
          harkRef.current.on("speaking", () => {
            videoRef.current?.classList.add("border-green-500");
          });
          harkRef.current.on("volume_change", (volume) => {
            console.log(`Mức âm lượng của ${username}: ${volume}`);
          });
        } else {
          console.warn(
            `No audio tracks found in remote stream for ${username}`
          );
        }
      }
    }
    return () => {
      if (harkRef.current) {
        harkRef.current.stop();
        harkRef.current = null;
      }
    };
  }, [isLocalStream, stream, username]);
  return (
    <div className="relative">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-auto rounded border-4"
      />
      <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded">
        {username}
      </div>
    </div>
  );
};
