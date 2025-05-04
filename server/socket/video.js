const { SESSION_RELOAD_INTERVAL } = require("../constants");
const { createPeer } = require("../utils/wrtc");
const webrtc = require("wrtc");
const ConversationService = require("../services/conversation");
const peers = new Map();
const rooms = new Map();
// room id -> {members: Set}
const consumers = new Map();

const initVideoCallNamespace = (videoCallNamespace, defaultNamespace) => {
  videoCallNamespace.on("connection", (client) => {
    const sessionTracker = setInterval(() => {
      client.request.session.reload((err) => {
        if (err) {
          client.conn.close();
        }
      });
    }, SESSION_RELOAD_INTERVAL);
    const session = client.request.session;

    if (!session || !session.userInfo) {
      client.emit("unauthorized");
      console.error(
        "Video namespace - Unauthorized client attempted to connect"
      );
      client.disconnect();
      return;
    }

    const userId = session.userInfo.id;

    console.log("Video namespace - Client connected: " + client.id);

    client.on("disconnect", () => {
      console.log("Video namespace - Client disconnected: " + userId);
      const peerInfo = peers.get(userId);
      if (peerInfo) {
        const roomId = peerInfo.roomId;
        if (roomId) {
          const room = rooms.get(roomId);
          if (room) {
            room.members.delete(userId);
            if (room.members.size === 0) {
              rooms.delete(roomId);
              defaultNamespace.in(roomId).emit("callEnded", {
                roomId,
                username: session.userInfo.fullName,
                email: session.userInfo.email,
              });
            } else {
              for (const [consumerId, consumerPeer] of consumers) {
                if (
                  consumerId.startsWith(`${userId}-`) ||
                  consumerId.endsWith(`-${userId}`)
                ) {
                  consumerPeer.close();
                  consumers.delete(consumerId);
                  console.log(
                    `[Server] Closed and deleted consumerPeer: ${consumerId}`
                  );
                }
              }
              client.in(roomId).emit("userLeft", { id: userId });
            }
          }
        }
        peerInfo.peer.close();
        delete peerInfo.stream;
        peers.delete(userId);
      }
      clearInterval(sessionTracker);
    });

    // Connect to a room
    client.on("joinRoom", async ({ conversationId, sdp }) => {
      try {
        const conversation =
          await ConversationService.verifyConversationAndUserByWs({
            conversationId,
            userId,
          });

        if (!conversation) {
          client.emit(
            "error",
            "Conversation not found or user not in conversation"
          );
          return;
        }

        const roomId = conversation._id.toString();

        client.join(roomId);

        peers.set(userId, {
          roomId,
          username: session.userInfo.fullName,
          email: session.userInfo.email,
        });

        const peer = createPeer();

        peers.get(userId).peer = peer;

        console.log(
          "Video namespace - User joined room: " +
            roomId +
            ", userId: " +
            userId
        );
        peer.ontrack = (event) => {
          if (event.streams && event.streams[0]) {
            const stream = event.streams[0];
            peers.get(userId).stream = stream;
            const videoTracks = stream.getVideoTracks();
            console.log(
              `[Server] Received stream from user ${userId}:`,
              stream.id
            );
            console.log(`[Server] Video tracks:`, videoTracks);
            if (videoTracks.length === 0) {
              console.warn(`[Server] No video tracks found for user ${userId}`);
            } else {
              console.log(
                `[Server] Video track enabled:`,
                videoTracks[0].enabled
              );
            }
            const payload = {
              id: userId,
              username: session.userInfo.fullName,
              email: session.userInfo.email,
            };
            client.to(roomId).emit("newProducer", payload);
          }
        };

        const desc = new webrtc.RTCSessionDescription(sdp);
        await peer.setRemoteDescription(desc);
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);

        const room = rooms.get(roomId) || { members: new Set() };
        room.members.add(userId);
        if (room.members.size === 1) {
          defaultNamespace.to(roomId).emit("callStarted", {
            roomId,
            username: session.userInfo.fullName,
            email: session.userInfo.email,
          });
        }
        rooms.set(roomId, room);

        client.emit("answer", { sdp: peer.localDescription });
      } catch (error) {
        console.error(error);
        client.emit("error", error.message || "Failed to join room");
      }
    });

    // Get peers in the room
    client.on("getPeers", () => {
      console.log("Video namespace - getPeers event received");
      const peerInfo = peers.get(userId);

      if (!peerInfo || !peerInfo.roomId) {
        return;
      }

      const roomId = peerInfo.roomId;
      const room = rooms.get(roomId);
      if (room) {
        const users = Array.from(room.members).filter(
          (memberId) => memberId !== userId
        );
        const peersInRoom = users
          .map((memberId) => {
            const peer = peers.get(memberId);
            if (peer) {
              return {
                id: memberId,
                username: peer.username,
                email: peer.email,
              };
            }
            return null;
          })
          .filter((peer) => peer !== null);

        console.log("Video namespace - Peers in room: " + peersInRoom);

        client.emit("peers", { peers: peersInRoom });
      }
    });

    // Handle ICE candidates
    client.on("iceCandidate", async ({ candidate }) => {
      try {
        const user = peers.get(userId);
        if (!user || !user.peer) {
          return;
        }
        await user.peer.addIceCandidate(new webrtc.RTCIceCandidate(candidate));
      } catch (error) {
        console.error(error);
        client.emit("error", error.message || "Failed to add ICE candidate");
      }
    });

    // Handle consumer
    client.on("consume", async ({ id, sdp, consumerId }) => {
      console.log("[Server] consume event received:", { id, consumerId });
      try {
        const remoteUser = peers.get(id);
        if (!remoteUser) throw new Error("Remote user not found");
        const newPeer = createPeer();
        consumers.set(consumerId, newPeer);
        console.log("[Server] created consumerPeer for", consumerId);
        const _desc = new webrtc.RTCSessionDescription(sdp);
        await newPeer.setRemoteDescription(_desc);
        console.log(
          "[Server] setRemoteDescription on consumerPeer",
          consumerId
        );
        remoteUser.stream.getTracks().forEach((track) => {
          newPeer.addTrack(track, remoteUser.stream);
          console.log(
            `[Server] Added track to consumerPeer ${consumerId}:`,
            track.kind,
            track.id,
            track.enabled
          );
        });
        const _answer = await newPeer.createAnswer();
        await newPeer.setLocalDescription(_answer);
        console.log("[Server] setLocalDescription on consumerPeer", consumerId);

        const _payload = {
          sdp: newPeer.localDescription,
          username: remoteUser.username,
          id,
          consumerId,
        };
        console.log("[Server] emitting consumerReady for", consumerId);
        client.emit("consumerReady", _payload);
      } catch (error) {
        console.error(error);
        client.emit("error", error.message || "Failed to consume stream");
      }
    });

    // Handle consumer ICE candidates
    client.on("consumerIceCandidate", async ({ candidate, consumerId }) => {
      try {
        const consumerPeer = consumers.get(consumerId);
        if (!consumerPeer) {
          throw new Error("Consumer not found");
        }
        await consumerPeer.addIceCandidate(
          new webrtc.RTCIceCandidate(candidate)
        );
      } catch (error) {
        console.error(error);
        client.emit(
          "error",
          error.message || "Failed to add consumer ICE candidate"
        );
      }
    });
  });
};

module.exports = initVideoCallNamespace;
