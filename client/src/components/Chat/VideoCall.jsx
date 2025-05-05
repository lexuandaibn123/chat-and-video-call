import React, { useState, useRef, useEffect } from 'react';

const VideoCall = ({ activeChat, userInfo, onClose }) => {
  const [localStream, setLocalStream] = useState(null);
  const localVideoRef = useRef(null);

  useEffect(() => {
    // Khởi tạo video cục bộ
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      })
      .catch((err) => {
        console.error('Error accessing media devices:', err);
        alert('Failed to access camera/microphone: ' + err.message);
      });

    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return (
    <div className="video-call-modal">
      <button onClick={onClose}>Close</button>
      <video ref={localVideoRef} autoPlay muted />
      <button disabled={!activeChat}>Join Call</button>
    </div>
  );
};

export default VideoCall;
