/* eslint-disable */
import io from "socket.io-client";

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
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    this.localStream = stream;
    this.createLocalPeer(roomId);
    this.localStream.getTracks().forEach((track) => {
      if (this.localPeer) {
        this.localPeer.addTrack(track, stream);
      }
    });
  },

  getLocalStream() {
    return this.localStream;
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
    await this.localPeer.setLocalDescription(offer);
    this.socket.emit("joinRoom", {
      conversationId: roomId,
      sdp: this.localPeer.localDescription,
    });
  },

  createLocalPeer(roomId) {
    this.localPeer = new RTCPeerConnection(this.configuration);
    this.localPeer.onicecandidate = (event) => {
      if (event.candidate) this.handleIceCandidate({ candidate: event.candidate });
    };
    this.localPeer.onnegotiationneeded = () => this.handleNegotiation(roomId);
  },

  handleConsumerIceCandidate(candidate, id, consumerId) {
    if (candidate && candidate.candidate && candidate.candidate.length > 0) {
      this.socket.emit("consumerIceCandidate", { candidate, consumerId });
    }
  },

  async createConsumeTransport(peer) {
    const consumerId = `${this.userId}-${peer.id}`;
    if (this.consumers.has(consumerId)) {
      console.log(`Consumer for ${consumerId} already exists, skipping`);
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
      console.log(`Before setLocalDescription for ${consumerId}, state: ${consumer.signalingState}`);
      await consumer.setLocalDescription(offer);
      console.log(`After setLocalDescription for ${consumerId}, state: ${consumer.signalingState}`);
      consumer.onicecandidate = (event) => {
        if (event.candidate) {
          this.handleConsumerIceCandidate(event.candidate, peer.id, consumerId);
        }
      };
      consumer.ontrack = (e) => {
        if (e.streams && e.streams[0]) {
          const stream = e.streams[0];
          console.log(`Received stream for ${consumerId}:`, stream);
          console.log(`Video tracks:`, stream.getVideoTracks());
          console.log(`Audio tracks:`, stream.getAudioTracks());
          if (stream.getAudioTracks().length > 0) {
            console.log(`Audio track enabled:`, stream.getAudioTracks()[0].enabled);
          }
          const streamInfo = {
            stream: e.streams[0],
            id: peer.id,
            username: peer.username,
            email: peer.email,
            consumerId: consumerId,
          };
          this.remoteStreams.set(consumerId, streamInfo);
          this.onStreamAdded(streamInfo);
        } else {
          console.warn(`No streams received for ${consumerId}`);
        }
      };
    }
    return { transport: consumerTransport, consumerId };
  },

  async consumeOnce(peer) {
    const { transport, consumerId } = await this.createConsumeTransport(peer);
    console.log(`Emitting consume for consumerId: ${consumerId}`);
    if (!transport) {
      console.error(`Transport is undefined for consumerId: ${consumerId}`);
      return;
    }
    this.socket.emit("consume", {
      id: peer.id,
      sdp: transport.localDescription,
      consumerId,
    });
  },

  async handleAnswer({ sdp }) {
    if (!this.localPeer) return;
    const desc = new RTCSessionDescription(sdp);
    try {
      await this.localPeer.setRemoteDescription(desc);
      await this.subscribe();
    } catch (e) {
      console.error("Error setting remote description:", e);
    }
  },

  async handlePeers({ peers }) {
    console.log("*** handle peers ***", peers);
    for (const peer of peers) {
      const consumerId = `${this.userId}-${peer.id}`;
      if (!this.consumers.has(consumerId)) {
        await this.consumeOnce(peer);
      } else {
        console.log(`Consumer for ${peer.id} already exists, skipping`);
      }
    }
  },

  handleConsume({ sdp, consumerId }) {
    console.log(`Received consumerReady for consumerId: ${consumerId}`);
    const desc = new RTCSessionDescription(sdp);
    const consumer = this.consumers.get(consumerId);
    if (consumer) {
      console.log(`Before setRemoteDescription for ${consumerId}, state: ${consumer.signalingState}`);
      consumer.setRemoteDescription(desc).catch((e) => {
        console.error(`Error setting remote description for ${consumerId}:`, e);
      });
    } else {
      console.error(`Consumer with ID ${consumerId} not found.`);
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
      console.log(`Removing consumer for ${consumerId}`);
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
    this.socket.on("error", (error) => console.error("Socket error:", error));
  }
};