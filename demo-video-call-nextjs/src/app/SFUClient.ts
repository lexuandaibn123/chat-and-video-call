import io, { Socket } from "socket.io-client";
export class SFUClient {
  private socket: Socket;
  private userId: string;
  private localPeer: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStreams: Map<
    string,
    {
      stream: MediaStream;
      id: string;
      username: string;
      email: string;
      consumerId?: string;
    }
  > = new Map();
  private consumers: Map<string, RTCPeerConnection> = new Map();
  private clients: Map<
    string,
    { id: string; username: string; email: string; consumerId?: string }
  > = new Map();
  private configuration: RTCConfiguration = {
    iceServers: [
      { urls: "stun:stun.stunprotocol.org:3478" },
      { urls: "stun:stun.l.google.com:19302" },
    ],
  };
  private onStreamAdded: (streamInfo: {
    stream: MediaStream;
    id: string;
    username: string;
    email: string;
    consumerId?: string;
  }) => void;
  private onStreamRemoved: (consumerId: string) => void;

  constructor(
    url: string,
    userId: string,
    onStreamAdded: (streamInfo: {
      stream: MediaStream;
      id: string;
      username: string;
      email: string;
      consumerId?: string;
    }) => void,
    onStreamRemoved: (consumerId: string) => void
  ) {
    this.socket = io(url, { withCredentials: true });
    this.userId = userId;
    this.onStreamAdded = onStreamAdded;
    this.onStreamRemoved = onStreamRemoved;
    this.handleMessage();
  }

  async connect(roomId: string) {
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
  }

  getLocalStream() {
    return this.localStream;
  }

  async subscribe() {
    await this.consumeAll();
  }

  async consumeAll() {
    this.socket.emit("getPeers");
  }

  async handleIceCandidate({ candidate }: { candidate: RTCIceCandidate }) {
    if (candidate && candidate.candidate && candidate.candidate.length > 0) {
      this.socket.emit("iceCandidate", { candidate });
    }
  }

  async handleNegotiation(roomId: string) {
    if (!this.localPeer) return;
    const offer = await this.localPeer.createOffer();
    await this.localPeer.setLocalDescription(offer);
    this.socket.emit("joinRoom", {
      conversationId: roomId,
      sdp: this.localPeer.localDescription,
    });
  }

  createLocalPeer(roomId: string) {
    this.localPeer = new RTCPeerConnection(this.configuration);
    this.localPeer.onicecandidate = (event) => {
      if (event.candidate)
        this.handleIceCandidate({ candidate: event.candidate });
    };
    this.localPeer.onnegotiationneeded = () => this.handleNegotiation(roomId);
  }

  handleConsumerIceCandidate(
    candidate: RTCIceCandidate,
    id: string,
    consumerId: string
  ) {
    if (candidate && candidate.candidate && candidate.candidate.length > 0) {
      this.socket.emit("consumerIceCandidate", { candidate, consumerId });
    }
  }

  async createConsumeTransport(peer: {
    id: string;
    username: string;
    email: string;
  }) {
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
      console.log(
        `Before setLocalDescription for ${consumerId}, state: ${consumer.signalingState}`
      );
      await consumer.setLocalDescription(offer);
      console.log(
        `After setLocalDescription for ${consumerId}, state: ${consumer.signalingState}`
      );
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
          console.log(
            `Number of audio tracks:`,
            stream.getAudioTracks().length
          );
          if (stream.getAudioTracks().length > 0) {
            console.log(
              `Audio track enabled:`,
              stream.getAudioTracks()[0].enabled
            );
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
  }

  async consumeOnce(peer: { id: string; username: string; email: string }) {
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
  }

  async handleAnswer({ sdp }: { sdp: RTCSessionDescriptionInit }) {
    if (!this.localPeer) return;
    const desc = new RTCSessionDescription(sdp);
    this.localPeer.setRemoteDescription(desc).catch((e) => console.log(e));
    await this.subscribe();
  }

  async handlePeers({
    peers,
  }: {
    peers: Array<{ id: string; username: string; email: string }>;
  }) {
    console.log("*** handle peers ***", peers);
    for (const peer of peers) {
      const consumerId = `${this.userId}-${peer.id}`;
      if (!this.consumers.has(consumerId)) {
        await this.consumeOnce(peer);
      } else {
        console.log(`Consumer for ${peer.id} already exists, skipping`);
      }
    }
  }

  handleConsume({
    sdp,
    consumerId,
  }: {
    sdp: RTCSessionDescriptionInit;
    id: string;
    username: string;
    consumerId: string;
  }) {
    console.log(`Received consumerReady for consumerId: ${consumerId}`);
    const desc = new RTCSessionDescription(sdp);
    const consumer = this.consumers.get(consumerId);
    if (consumer) {
      console.log(
        `Before setRemoteDescription for ${consumerId}, state: ${consumer.signalingState}`
      );
      consumer.setRemoteDescription(desc).catch((e) => {
        console.error(`Error setting remote description for ${consumerId}:`, e);
      });
    } else {
      console.error(`Consumer with ID ${consumerId} not found.`);
    }
  }

  async handleNewProducer({
    id,
    username,
    email,
  }: {
    id: string;
    username: string;
    email: string;
  }) {
    if (id === this.userId) return;
    const consumerId = `${this.userId}-${id}`;
    if (!this.consumers.has(consumerId)) {
      await this.consumeOnce({ id, username, email });
    }
  }

  removeUser({ id }: { id: string }) {
    const client = this.clients.get(id);
    if (!client) return;
    const { consumerId } = client;
    if (consumerId) {
      console.log(`Removing consumer for ${consumerId}`);
      const consumer = this.consumers.get(consumerId);
      console.log(`Consumer:`, consumer);
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
  }

  handleMessage() {
    this.socket.on("answer", (data) => this.handleAnswer(data));
    this.socket.on("peers", (data) => this.handlePeers(data));
    this.socket.on("newProducer", (data) => this.handleNewProducer(data));
    this.socket.on("consumerReady", (data) => this.handleConsume(data));
    this.socket.on("userLeft", (data) => this.removeUser(data));
    this.socket.on("error", (error) => console.error("Socket error:", error));
  }
}
