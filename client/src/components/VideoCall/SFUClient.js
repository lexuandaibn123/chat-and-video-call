import io from "socket.io-client";
import {toast} from "react-toastify";

export default function SFUClient(url, userId, onStreamAdded, onStreamRemoved) {
  this.socket = io(url, { withCredentials: true });
  this.userId = userId;
  this.localPeer = null;
  this.localStream = null;
  this.remoteStreams = new Map();
  this.consumers = new Map();
  this.clients = new Map();
  this.configuration = {
    iceServers: [
      { urls: "stun:stun.stunprotocol.org:3478" },
      { urls: "stun:stun.l.google.com:19302" },
      {
        urls: "turn:54.251.71.205:3478", 
        username: "seedlabs",
        credential: "seedlabsturn",
      },
    ],
  };
  this.onStreamAdded = onStreamAdded;
  this.onStreamRemoved = onStreamRemoved;

  this.handleMessage();
}

SFUClient.prototype = {
  socket: null,
  userId: null,
  localPeer: null,
  localStream: null,
  remoteStreams: null,
  consumers: null,
  clients: null,
  configuration: null,
  onStreamAdded: null,
  onStreamRemoved: null,

  async connect(roomId) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      this.localStream = stream;
      console.log("Local stream initialized:", stream);
      this.createLocalPeer(roomId);
      this.localStream.getTracks().forEach((track) => {
        console.log(`Track: ${track.kind}, enabled: ${track.enabled}`);
        if (this.localPeer) {
          this.localPeer.addTrack(track, stream);
        }
      });
    } catch (error) {
      console.error("getUserMedia failed:", error);
      toast.error("Unable to access camera/microphone. Please check permissions or device.");
      throw error;
    }
  },

  getLocalStream() {
    return this.localStream;
  },

  toggleMic() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        if (audioTrack.enabled) {
          // Tắt mic: Loại bỏ track khỏi RTCPeerConnection
          this.localPeer.getSenders().forEach((sender) => {
            if (sender.track === audioTrack) {
              this.localPeer.removeTrack(sender);
            }
          });
          audioTrack.enabled = false;
        } else {
          // Bật mic: Thêm lại track vào RTCPeerConnection
          this.localPeer.addTrack(audioTrack, this.localStream);
          audioTrack.enabled = true;
        }
        // Thông báo trạng thái mới
        this.notifyStatusUpdate({ audioEnabled: audioTrack.enabled });
      } else {
        console.warn("No audio track found to toggle.");
      }
    }
  },

  toggleCamera() {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        this.notifyStatusUpdate({ videoEnabled: videoTrack.enabled });
        console.log(`Camera toggled: ${videoTrack.enabled}`);
      } else {
        console.warn("No video track found to toggle.");
      }
    }
  },

  notifyStatusUpdate(status) {
    this.socket.emit("updateStatus", status);
  },

  async shareScreen() {
    const screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
    });
    const screenTrack = screenStream.getVideoTracks()[0];
    this.localPeer.replaceTrack(
      this.localStream.getVideoTracks()[0],
      screenTrack,
      this.localStream
    );
    screenTrack.onended = () => {
      this.localPeer.replaceTrack(
        screenTrack,
        this.localStream.getVideoTracks()[0],
        this.localStream
      );
    };
  },

  async subscribe() {
    await this.consumeAll();
  },

  async consumeAll() {
    this.socket.emit("getPeers");
  },

  async handleIceCandidate({ candidate }) {
    if (candidate && candidate.candidate && candidate.candidate.length > 0) {
      this.socket.emit("iceCandidate", { candidate });
    }
  },

  async handleNegotiation(roomId) {
    if (!this.localPeer) return;
    const offer = await this.localPeer.createOffer();
    offer.sdp = this.limitBandwidth(offer.sdp, 1000);
    await this.localPeer.setLocalDescription(offer);
    if (roomId)
      this.socket.emit("joinRoom", {
        conversationId: roomId,
        sdp: this.localPeer.localDescription,
      });
  },

  limitBandwidth(sdp, bandwidth) {
    return sdp.replace(/b=AS:.*\r\n/, `b=AS:${bandwidth}\r\n`);
  },

  createLocalPeer(roomId) {
    this.localPeer = new RTCPeerConnection(this.configuration);
    this.localPeer.onicecandidate = (event) => {
      console.log("ICE Candidate:", event.candidate);
      if (event.candidate)
        this.handleIceCandidate({ candidate: event.candidate });
    };
    this.localPeer.onnegotiationneeded = () => this.handleNegotiation(roomId);
    this.localPeer.oniceconnectionstatechange = () => {
      if (this.localPeer.iceConnectionState === "disconnected") {
        console.warn("ICE disconnected, restarting peer...");
        this.createLocalPeer(roomId);
        this.localStream.getTracks().forEach((track) => {
          this.localPeer.addTrack(track, this.localStream);
        });
      }
      if (this.localPeer.iceConnectionState === "failed") {
        console.error("ICE connection failed, consider restarting peer");
      }
    };
  },

  handleConsumerIceCandidate(candidate, id, consumerId) {
    if (candidate && candidate.candidate && candidate.candidate.length > 0) {
      this.socket.emit("consumerIceCandidate", { candidate, consumerId });
    }
  },

  async createConsumeTransport(peer) {
    const consumerId = `${this.userId}-${peer.id}`;
    if (this.consumers.has(consumerId)) {
      return { transport: this.consumers.get(consumerId), consumerId };
    }
    const consumerTransport = new RTCPeerConnection(this.configuration);
    const client = this.clients.get(peer.id) || {
      id: peer.id,
      username: peer.username,
      email: peer.email,
    };
    client.consumerId = consumerId;
    this.consumers.set(consumerId, consumerTransport);
    this.clients.set(peer.id, client);
    const consumer = this.consumers.get(consumerId);
    if (consumer) {
      consumer.addTransceiver("video", { direction: "recvonly" });
      consumer.addTransceiver("audio", { direction: "recvonly" });
      const offer = await consumer.createOffer();
      await consumer.setLocalDescription(offer);
      consumer.onicecandidate = (event) => {
        if (event.candidate) {
          this.handleConsumerIceCandidate(event.candidate, peer.id, consumerId);
        }
      };
      consumer.ontrack = (e) => {
        if (e.streams && e.streams[0]) {
          const streamInfo = {
            stream: e.streams[0],
            id: peer.id,
            username: peer.username,
            email: peer.email,
            consumerId: consumerId,
          };
          this.remoteStreams.set(consumerId, streamInfo);
          this.onStreamAdded(streamInfo);
        }
      };
    }
    return { transport: consumerTransport, consumerId };
  },

  async consumeOnce(peer) {
    const { transport, consumerId } = await this.createConsumeTransport(peer);
    if (!transport) return;
    this.socket.emit("consume", {
      id: peer.id,
      sdp: transport.localDescription,
      consumerId,
    });
  },

  async handleAnswer({ sdp }) {
    if (!this.localPeer) return;
    const desc = new RTCSessionDescription(sdp);
    await this.localPeer.setRemoteDescription(desc);
    await this.subscribe();
  },

  async handlePeers({ peers }) {
    for (const peer of peers) {
      const consumerId = `${this.userId}-${peer.id}`;
      if (!this.consumers.has(consumerId)) {
        await this.consumeOnce(peer);
      }
    }
  },

  handleConsume({ sdp, consumerId }) {
    const desc = new RTCSessionDescription(sdp);
    const consumer = this.consumers.get(consumerId);
    if (consumer) {
      consumer.setRemoteDescription(desc).catch((e) => {
        console.error(`Error setting remote description for ${consumerId}:`, e);
      });
    }
  },

  async handleNewProducer({ id, username, email }) {
    if (id === this.userId) return;
    const consumerId = `${this.userId}-${id}`;
    if (!this.consumers.has(consumerId)) {
      await this.consumeOnce({ id, username, email });
    }
  },

  removeUser({ id }) {
    const client = this.clients.get(id);
    if (!client) return;
    const { consumerId } = client;
    if (consumerId) {
      const consumer = this.consumers.get(consumerId);
      if (consumer) {
        consumer.close();
        this.consumers.delete(consumerId);
        if (this.remoteStreams.has(consumerId)) {
          this.remoteStreams.delete(consumerId);
          this.onStreamRemoved(consumerId);
        }
      }
    }
    this.clients.delete(id);
  },

  handleMessage() {
    this.socket.on("answer", (data) => this.handleAnswer(data));
    this.socket.on("peers", (data) => this.handlePeers(data));
    this.socket.on("newProducer", (data) => this.handleNewProducer(data));
    this.socket.on("consumerReady", (data) => this.handleConsume(data));
    this.socket.on("userLeft", (data) => this.removeUser(data));
    this.socket.on("statusUpdated", ({ userId, audioEnabled, videoEnabled }) => {
      const streamInfo = Array.from(this.remoteStreams.values()).find(
        (info) => info.id === userId
      );
      if (streamInfo) {
        const updatedStreamInfo = {
          ...streamInfo,
          micEnabled: audioEnabled !== undefined ? audioEnabled : streamInfo.micEnabled || true,
          cameraEnabled: videoEnabled !== undefined ? videoEnabled : streamInfo.cameraEnabled || true,
        };
        this.remoteStreams.set(streamInfo.consumerId, updatedStreamInfo);
        this.onStreamAdded(updatedStreamInfo);
      }
    });
    this.socket.on("error", (error) => {
      console.error("Socket error:", error);
      toast.error("A connection error occurred. Please try again.");
    });
  },

  close() {
    console.log(`Closing SFUClient for user ${this.userId}`);
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        console.log(
          `Stopping track: ${track.kind}, id: ${track.id}, enabled: ${track.enabled}`
        );
        track.stop();
        track.enabled = false;
      });
      this.localStream = null;
    }
    if (this.localPeer) {
      this.localPeer.close();
      this.localPeer = null;
    }
    for (const [consumerId, consumer] of this.consumers) {
      consumer.close();
      this.consumers.delete(consumerId);
    }
    this.remoteStreams.clear();
    this.clients.clear();
    if (this.socket.connected) {
      this.socket.disconnect();
    }
  },
};