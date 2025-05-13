const webrtc = require("wrtc");

function createPeer() {
  const peer = new webrtc.RTCPeerConnection({
    iceServers: [
      { urls: "stun:stun.stunprotocol.org:3478" },
      { urls: "stun:stun.l.google.com:19302" },
      // {
      //   urls: "turn:54.251.71.205:3478",
      //   username: "seedlabs",
      //   credential: "seedlabsturn",
      // },
    ],
  });

  return peer;
}

module.exports = {
  createPeer,
};
