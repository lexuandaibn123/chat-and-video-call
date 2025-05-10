import React, { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import './VideoCall.css'; // Import CSS
import './Chat.scss';

const VideoCall = ({ activeChat, userInfo, videoCallSocket, onClose }) => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({}); // { id: { stream, username, micEnabled, cameraEnabled } }
  const [hasJoined, setHasJoined] = useState(false);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const localVideoRef = useRef(null);
  const peerConnections = useRef({});
  const consumersCreated = useRef(new Map());

  useEffect(() => {
    if (!userInfo || !userInfo.id) {
      console.error('VideoCall: Missing userInfo or userInfo.id');
      alert('Thông tin người dùng không hợp lệ. Vui lòng đăng nhập lại.');
      onClose();
      return;
    }

    if (!videoCallSocket) {
      console.error('VideoCall: Video call socket is not provided');
      alert('Không thể kết nối đến server. Vui lòng thử lại.');
      onClose();
      return;
    }

    const checkMediaPermissions = async () => {
      try {
        console.log('Accessing media devices...');
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        console.log('Local stream obtained:', stream);
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
      joinRoom();
    });

    videoCallSocket.on('connect_error', (error) => {
      console.error('Video call namespace connection error:', error);
      alert('Không thể kết nối đến server video call. Vui lòng thử lại.');
      onClose();
    });

    videoCallSocket.on('answer', async ({ sdp }) => {
      try {
        const peerId = Object.keys(peerConnections.current)[0];
        const peerConnection = peerConnections.current[peerId];
        if (peerConnection) {
          if (peerConnection.signalingState !== 'have-local-offer') {
            console.warn(`Cannot set remote description for ${peerId}: Invalid signaling state (${peerConnection.signalingState})`);
            return;
          }
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
      if (data.id !== userInfo.id) {
        createConsumer(data.id, data.username);
      }
    });

    videoCallSocket.on('userLeft', (data) => {
      console.log('User left:', data.id);
      const consumerId = consumersCreated.current.get(data.id);
      if (consumerId) {
        removePeer(consumerId);
        consumersCreated.current.delete(data.id);
      }
    });

    videoCallSocket.on('consumerReady', async ({ sdp, id, consumerId }) => {
      const peerConnection = peerConnections.current[consumerId];
      if (peerConnection) {
        try {
          if (peerConnection.signalingState !== 'have-local-offer') {
            console.warn(`Cannot set remote description for ${consumerId}: Invalid signaling state (${peerConnection.signalingState})`);
            return;
          }
          const desc = new RTCSessionDescription(sdp);
          await peerConnection.setRemoteDescription(desc);
          console.log(`Set remote description for consumer ${consumerId}`);
        } catch (error) {
          console.error('Error setting remote description:', error);
        }
      } else {
        console.warn(`No peer connection found for consumer ${consumerId}`);
      }
    });

    videoCallSocket.on('deviceStatus', ({ id, micEnabled, cameraEnabled }) => {
      setRemoteStreams((prev) => ({
        ...prev,
        [id]: {
          ...prev[id],
          micEnabled,
          cameraEnabled,
        },
      }));
    });

    videoCallSocket.on('error', (message) => {
      console.error('Video call namespace error:', message);
      alert(`Lỗi từ server: ${message}`);
    });

    return () => {
      cleanup();
      consumersCreated.current.clear();
    };
  }, [activeChat, userInfo, videoCallSocket, onClose]);

  const createPeerConnection = (id, username, isConsumer = false) => {
  try {
    const peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });
    peerConnections.current[id] = peerConnection;

    if (localStream && !isConsumer) {
      localStream.getTracks().forEach((track) => {
        console.log(`Adding track to peerConnection ${id}:`, track.kind);
        peerConnection.addTrack(track, localStream);
      });
    }

    peerConnection.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        console.log('ontrack triggered for peer:', id, event.streams[0]);
        setRemoteStreams((prev) => ({
          ...prev,
          [id]: {
            stream: event.streams[0],
            username: username || 'Unknown',
            micEnabled: true,
            cameraEnabled: true,
          },
        }));
      }
    };

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        videoCallSocket.emit(isConsumer ? 'consumerIceCandidate' : 'iceCandidate', {
          candidate: event.candidate,
          peerId: id,
          consumerId: isConsumer ? id : undefined,
        });
      }
    };

    peerConnection.onconnectionstatechange = () => {
      console.log(`Peer ${id} connection state: ${peerConnection.connectionState}`);
    };

    return peerConnection;
  } catch (error) {
    console.error(`Error creating peer connection for ${id}:`, error);
    return null;
  }
};

  const joinRoom = async () => {
    if (hasJoined || !activeChat || !activeChat.id || !localStream) {
      console.warn('Cannot join room: Already joined, no active chat, or no local stream');
      return;
    }

    if (!videoCallSocket || !videoCallSocket.connected) {
      console.error('Cannot join room: Video call socket is not connected');
      alert('Không thể kết nối đến server video call. Vui lòng thử lại.');
      return;
    }

    setHasJoined(true);

    const peerId = `${userInfo.id}-${uuidv4()}`;
    const peerConnection = createPeerConnection(peerId, userInfo.fullName);

    if (!peerConnection) {
      console.error('Failed to create peer connection');
      setHasJoined(false);
      return;
    }

    try {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      if (!offer || !offer.sdp || !offer.type) {
        throw new Error('Invalid SDP generated');
      }

      console.log('Emitting joinRoom with payload:', {
        conversationId: activeChat.id,
        sdp: offer,
      });

      videoCallSocket.emit('joinRoom', {
        conversationId: activeChat.id,
        sdp: offer,
      });
    } catch (error) {
      console.error('Error joining room:', error);
      setHasJoined(false);
      alert(`Lỗi khi tham gia cuộc gọi: ${error.message}`);
    }
  };

  const createConsumer = async (id, username) => {
    if (consumersCreated.current.has(id)) {
      console.log(`Consumer already created for user ${id}, skipping`);
      return;
    }

    const consumerId = `${userInfo.id}-${id}-${uuidv4()}`;
    consumersCreated.current.set(id, consumerId);

    const peerConnection = createPeerConnection(consumerId, username, true);
    if (!peerConnection) {
      consumersCreated.current.delete(id);
      return;
    }

    try {
      if (peerConnection.signalingState !== 'stable') {
        console.warn(`Cannot create offer for ${consumerId}: Invalid signaling state (${peerConnection.signalingState})`);
        consumersCreated.current.delete(id);
        removePeer(consumerId);
        return;
      }
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      videoCallSocket.emit('consume', {
        id,
        sdp: offer,
        consumerId,
      });
    } catch (error) {
      console.error('Error creating consumer:', error);
      consumersCreated.current.delete(id);
      removePeer(consumerId);
    }
  };

  const removePeer = (id) => {
    const peerConnection = peerConnections.current[id];
    if (peerConnection) {
      peerConnection.close();
      delete peerConnections.current[id];
      for (const [userId, consumerId] of consumersCreated.current) {
        if (consumerId === id) {
          consumersCreated.current.delete(userId);
          break;
        }
      }
    }
    setRemoteStreams((prev) => {
      const newStreams = { ...prev };
      delete newStreams[id];
      return newStreams;
    });
  };

  const cleanup = () => {
    if (localStream) {
      console.log('Cleaning up local stream:', localStream);
      localStream.getTracks().forEach((track) => track.stop());
    }
    Object.values(peerConnections.current).forEach((pc) => pc.close());
    peerConnections.current = {};
    setLocalStream(null);
    setRemoteStreams({});
    setHasJoined(false);
    if (videoCallSocket && activeChat?.id) {
      videoCallSocket.emit('leaveRoom', { conversationId: activeChat.id });
    }
  };

  const toggleMic = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicEnabled(audioTrack.enabled);
        videoCallSocket.emit('deviceStatus', {
          id: userInfo.id,
          micEnabled: audioTrack.enabled,
          cameraEnabled,
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
        videoCallSocket.emit('deviceStatus', {
          id: userInfo.id,
          micEnabled,
          cameraEnabled: videoTrack.enabled,
        });
      }
    }
  };

  // Tính số lượng người tham gia (bao gồm cả local)
  const participantCount = Object.keys(remoteStreams).length + (localStream ? 1 : 0);

  return (
    <div className="video-call-container">
      <h2>Cuộc gọi video ({participantCount} người tham gia)</h2>
      <div className={`video-grid participant-count-${participantCount}`}>
        {/* Local video */}
        {localStream && (
          <div className="video-wrapper">
            <video ref={localVideoRef} autoPlay muted className="video-element" />
            <div className="video-info">
              <span className="username">{userInfo.fullName || 'Bạn'}</span>
              <div className="status-icons">
                <span className={`icon ${micEnabled ? 'mic-on' : 'mic-off'}`}>
                  {micEnabled ? '🎤' : '🔇'}
                </span>
                <span className={`icon ${cameraEnabled ? 'camera-on' : 'camera-off'}`}>
                  {cameraEnabled ? '📷' : '📷'}
                </span>
              </div>
            </div>
          </div>
        )}
        {/* Remote videos */}
        {Object.entries(remoteStreams).map(([id, { stream, username, micEnabled, cameraEnabled }]) => (
          <div key={id} className="video-wrapper">
            <video autoPlay srcObject={stream} className="video-element" />
            <div className="video-info">
              <span className="username">{username || 'Unknown'}</span>
              <div className="status-icons">
                <span className={`icon ${micEnabled ? 'mic-on' : 'mic-off'}`}>
                  {micEnabled ? '🎤' : '🔇'}
                </span>
                <span className={`icon ${cameraEnabled ? 'camera-on' : 'camera-off'}`}>
                  {cameraEnabled ? '📷' : '📷'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="controls">
        <button onClick={toggleMic} className={micEnabled ? 'control-btn' : 'control-btn off'}>
          {micEnabled ? 'Tắt Mic' : 'Bật Mic'}
        </button>
        <button onClick={toggleCamera} className={cameraEnabled ? 'control-btn' : 'control-btn off'}>
          {cameraEnabled ? 'Tắt Camera' : 'Bật Camera'}
        </button>
        <button onClick={joinRoom} disabled={!activeChat || hasJoined} className="control-btn">
          Tham gia cuộc gọi
        </button>
        <button onClick={onClose} className="control-btn leave">
          Rời cuộc gọi
        </button>
      </div>
    </div>
  );
};

export default VideoCall;