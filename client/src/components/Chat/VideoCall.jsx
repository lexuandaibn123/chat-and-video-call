import React, { useState, useRef, useEffect } from 'react';
import io from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';

// Định nghĩa URL server từ biến môi trường hoặc mặc định là localhost:8800
const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:8800';

const VideoCall = ({ activeChat, userInfo, onClose }) => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const localVideoRef = useRef(null);
  const socketRef = useRef(null); // Quản lý instance Socket.IO
  const peerConnections = useRef({});

  useEffect(() => {
    // Kiểm tra thông tin người dùng
    if (!userInfo || !userInfo.id) {
      console.error('VideoCall: Thiếu thông tin userInfo hoặc userInfo.id');
      alert('Thông tin người dùng không hợp lệ. Vui lòng đăng nhập lại.');
      onClose();
      return;
    }

    // Khởi tạo kết nối Socket.IO một lần duy nhất
    if (!socketRef.current) {
      socketRef.current = io(`${SERVER_URL}/video-call`, {
        auth: { userInfo },
        transports: ['websocket'], // Ưu tiên WebSocket thay vì polling
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });
    }

    const socket = socketRef.current;

    // Xử lý các sự kiện Socket.IO
    socket.on('connect', () => {
      console.log('Đã kết nối đến server video call:', socket.id);
    });

    socket.on('connect_error', (error) => {
      console.error('Lỗi kết nối Socket.IO:', error);
      alert('Không thể kết nối đến server. Vui lòng kiểm tra lại.');
      onClose();
    });

    socket.on('disconnect', () => {
      console.log('Ngắt kết nối từ server');
      cleanup();
    });

    socket.on('newProducer', (data) => {
      console.log('Người dùng mới tham gia:', data);
      createConsumer(data.id, data.username);
    });

    socket.on('userLeft', (data) => {
      console.log('Người dùng rời khỏi:', data.id);
      removePeer(data.id);
    });

    // Khởi tạo stream video cục bộ
    const startVideo = async () => {
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
        if (err.name === 'NotAllowedError') {
          alert('Vui lòng cấp quyền truy cập camera và micro.');
        } else {
          console.error('Lỗi truy cập media:', err);
          alert('Không thể truy cập thiết bị media.');
        }
      }
    };

    startVideo();

    // Dọn dẹp khi component unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      cleanup();
    };
  }, [activeChat, userInfo, onClose]);

  // Tạo kết nối peer-to-peer
  const createPeerConnection = (id, username) => {
    const peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }], // STUN server miễn phí
    });
    peerConnections.current[id] = peerConnection;

    if (localStream) {
      localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
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
        socketRef.current.emit('iceCandidate', {
          candidate: event.candidate,
          peerId: id,
        });
      }
    };

    return peerConnection;
  };

  // Tham gia phòng gọi
  const joinRoom = async () => {
    if (!activeChat || !activeChat.id) {
      alert('Không có cuộc trò chuyện nào được chọn.');
      return;
    }

    const peerId = `${userInfo.id}-${uuidv4()}`;
    const peerConnection = createPeerConnection(peerId, userInfo.fullName);

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    socketRef.current.emit('joinRoom', {
      conversationId: activeChat.id,
      sdp: offer,
      peerId,
    });
  };

  // Tạo consumer cho người dùng khác
  const createConsumer = async (id, username) => {
    const consumerId = `${userInfo.id}-${id}-${uuidv4()}`;
    const peerConnection = createPeerConnection(consumerId, username);

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    socketRef.current.emit('consume', {
      id,
      sdp: offer,
      consumerId,
    });
  };

  // Xóa peer khi người dùng rời khỏi
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

  // Dọn dẹp tài nguyên
  const cleanup = () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    Object.values(peerConnections.current).forEach((pc) => pc.close());
    peerConnections.current = {};
    setLocalStream(null);
    setRemoteStreams({});
  };

  return (
    <div className="video-call-modal">
      <h2>Cuộc gọi video</h2>
      <video ref={localVideoRef} autoPlay muted style={{ width: '300px' }} />
      {Object.entries(remoteStreams).map(([id, stream]) => (
        <video key={id} autoPlay srcObject={stream} style={{ width: '300px' }} />
      ))}
      <button onClick={joinRoom} disabled={!activeChat}>
        Tham gia cuộc gọi
      </button>
      <button onClick={onClose}>Đóng</button>
    </div>
  );
};

export default VideoCall;