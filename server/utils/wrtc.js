const webrtc = require("wrtc");

function createPeer() {
  const peer = new webrtc.RTCPeerConnection({
    iceServers: [
      { urls: "stun:stun.stunprotocol.org:3478" },
      { urls: "stun:stun.l.google.com:19302" },
    ],
  });

  return peer;
}

function handleTrackEvent(event, peers, peer, io) {
  if (e.streams && e.streams[0]) {
    peers.get(peer).stream = e.streams[0];

    const payload = {
      type: "newProducer",
      id: peer,
      username: peers.get(peer).username,
    };
    wss.broadcast(JSON.stringify(payload));
  }
}

module.exports = {
  createPeer,
};
