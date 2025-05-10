import React, { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import io from 'socket.io-client';

// Định nghĩa URL server từ biến môi trường hoặc mặc định là localhost:8800
const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:8800';

const VideoCall = ({ activeChat, userInfo, socket, onClose }) => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [hasJoined, setHasJoined] = useState(false);
  const localVideoRef = useRef(null);
  const peerConnections = useRef({});
  const videoCallSocketRef = useRef(null);

  useEffect(() => {
    if (!userInfo || !userInfo.id) {
      console.error('VideoCall: Missing userInfo or userInfo.id');
      alert('Thông tin người dùng không hợp lệ. Vui lòng đăng nhập lại.');
      onClose();
      return;
    }

    if (!socket) {
      console.error('VideoCall: Socket is not provided');
      alert('Không thể kết nối đến server. Vui lòng thử lại.');
      onClose();
      return;
    }

    // Tạo kết nối tới namespace /video-call
    videoCallSocketRef.current = io(`${SERVER_URL}/video-call`, {
      auth: { userInfo },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    const videoCallSocket = videoCallSocketRef.current;

    const checkMediaPermissions = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        stream.getTracks().forEach((track) => track.stop());
        return true;
      } catch (error) {
        console.error('Media permission error:', error);
        alert('Vui lòng cấp quyền truy cập camera và micro.');
        return false;
      }
    };

    const startVideo = async () => {
      const hasPermission = await checkMediaPermissions();
      if (!hasPermission) {
        onClose();
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Error accessing media:', err);
        alert('Không thể truy cập thiết bị media.');
        onClose();
      }
    };

    startVideo();

    videoCallSocket.on('connect', () => {
      console.log('Connected to video call namespace:', videoCallSocket.id);
    });

    videoCallSocket.on('connect_error', (error) => {
      console.error('Video call namespace connection error:', error);
      alert('Không thể kết nối đến server video call. Vui lòng thử lại.');
      onClose();
    });

    videoCallSocket.on('answer', async ({ sdp }) => {
      try {
        const peerId = Object.keys(peerConnections.current)[0]; // Giả sử chỉ có một peer khi nhận answer
        const peerConnection = peerConnections.current[peerId];
        if (peerConnection) {
          const desc = new RTCSessionDescription(sdp);
          await peerConnection.setRemoteDescription(desc);
          console.log('Set remote description for peer:', peerId);
        }
      } catch (error) {
        console.error('Error setting remote description:', error);
      }
    });

    videoCallSocket.on('newProducer', (data) => {
      console.log('New user joined:', data);
      createConsumer(data.id, data.username);
    });

    videoCallSocket.on('userLeft', (data) => {
      console.log('User left:', data.id);
      removePeer(data.id);
    });

    videoCallSocket.on('consumerReady', async ({ sdp, id, consumerId }) => {
      const peerConnection = peerConnections.current[consumerId];
      if (peerConnection) {
        try {
          const desc = new RTCSessionDescription(sdp);
          await peerConnection.setRemoteDescription(desc);
          console.log(`Set remote description for consumer ${consumerId}`);
        } catch (error) {
          console.error('Error setting remote description:', error);
        }
      }
    });

    videoCallSocket.on('error', (message) => {
      console.error('Video call namespace error:', message);
      alert(`Lỗi từ server: ${message}`);
    });

    return () => {
      cleanup();
      if (videoCallSocketRef.current) {
        videoCallSocketRef.current.disconnect();
        videoCallSocketRef.current = null;
      }
    };
  }, [activeChat, userInfo, socket, onClose]);

  const createPeerConnection = (id, username, isConsumer = false) => {
    try {
      const peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      peerConnections.current[id] = peerConnection;

      if (localStream) {
        localStream.getTracks().forEach((track) => {
          try {
            peerConnection.addTrack(track, localStream);
          } catch (error) {
            console.error(`Error adding track for peer ${id}:`, error);
          }
        });
      }

      peerConnection.ontrack = (event) => {
        setRemoteStreams((prev) => ({
          ...prev,
          [id]: event.streams[0],
        }));
      };

      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          videoCallSocketRef.current.emit(isConsumer ? 'consumerIceCandidate' : 'iceCandidate', {
            candidate: event.candidate,
            peerId: id,
            consumerId: isConsumer ? id : undefined,
          });
        }
      };

      peerConnection.onerror = (error) => {
        console.error(`Peer connection error for ${id}:`, error);
      };

      peerConnection.onconnectionstatechange = () => {
        console.log(`Peer ${id} connection state: ${peerConnection.connectionState}`);
        if (peerConnection.connectionState === 'failed') {
          removePeer(id);
        }
      };

      return peerConnection;
    } catch (error) {
      console.error(`Error creating peer connection for ${id}:`, error);
      return null;
    }
  };

  const joinRoom = async () => {
    if (hasJoined || !activeChat || !activeChat.id) {
      return;
    }

    setHasJoined(true);

    const peerId = `${userInfo.id}-${uuidv4()}`;
    const peerConnection = createPeerConnection(peerId, userInfo.fullName);

    if (!peerConnection) {
      setHasJoined(false);
      return;
    }

    try {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      videoCallSocketRef.current.emit('joinRoom', {
        conversationId: activeChat.id,
        sdp: offer,
      });
    } catch (error) {
      console.error('Error joining room:', error);
      setHasJoined(false);
    }
  };

  const createConsumer = async (id, username) => {
    const consumerId = `${userInfo.id}-${id}-${uuidv4()}`;
    const peerConnection = createPeerConnection(consumerId, username, true);

    if (!peerConnection) {
      return;
    }

    try {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      videoCallSocketRef.current.emit('consume', {
        id,
        sdp: offer,
        consumerId,
      });
    } catch (error) {
      console.error('Error creating consumer:', error);
    }
  };

  const removePeer = (id) => {
    const peerConnection = peerConnections.current[id];
    if (peerConnection) {
      peerConnection.close();
      delete peerConnections.current[id];
    }
    setRemoteStreams((prev) => {
      const newStreams = { ...prev };
      delete newStreams[id];
      return newStreams;
    });
  };

  const cleanup = () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    Object.values(peerConnections.current).forEach((pc) => pc.close());
    peerConnections.current = {};
    setLocalStream(null);
    setRemoteStreams({});
    setHasJoined(false);
    if (videoCallSocketRef.current && activeChat?.id) {
      videoCallSocketRef.current.emit('leaveRoom', { conversationId: activeChat.id });
    }
  };

  return (
    <div className="video-call-modal">
      <h2>Cuộc gọi video</h2>
      <video ref={localVideoRef} autoPlay muted style={{ width: '300px' }} />
      {Object.entries(remoteStreams).map(([id, stream]) => (
        <video key={id} autoPlay srcObject={stream} style={{ width: '300px' }} />
      ))}
      <button onClick={joinRoom} disabled={!activeChat || hasJoined}>
        Tham gia cuộc gọi
      </button>
      <button onClick={onClose}>Đóng</button>
    </div>
  );
};

export default VideoCall;