export const DATACHAN_CONF = {
  ordered: false, 
  maxRetransmits: 0,
//  maxPacketLifeTime: null,
  protocol: "",
//  negotiated: false,
};

export const PEER_CONNECTION_CONFIG = {
    iceServers: [
    {
      urls: [ "turns:pipe.puscii.nl", "turn:pipe.puscii.nl" ],
      username: "turnuser",
      credential: "verysecretpassword"
    },
    { 
      urls: "stun:pipe.puscii.nl" 
    },
  ]
};

