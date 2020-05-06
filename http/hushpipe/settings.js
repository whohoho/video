export const DATACHAN_CONF = {
  ordered: false, 
  maxRetransmits: 0,
//  maxPacketLifeTime: null,
  protocol: "",
//  negotiated: false,
};

//////////////////export const PEER_CONNECTION_CONFIG = {};

export const PEER_CONNECTION_CONFIG = {
    optional:[
      { googIPv6: false }
    ],
    bundlePolicy: "balanced",
    iceCandidatePoolSize: 10,
    peerIdentity: null, // don't care about remote cert
    rtcpMuxPolicy: "negotiate",
    iceTransportPolicy:"all", // relay, all, 
    iceServers: [
      /*
    {
      urls: [ "turns:pipe.puscii.nl", "turn:pipe.puscii.nl" ],
      username: "turnuser",
      credential: "verysecretpassword"
    },
     */ 
 /*   { 'urls': 'turn:ec2-54-68-238-149.us-west-2.compute.amazonaws.com:3478', 'username': 'test', 'credential': 'test' },
    { 'urls': ['stun:stun.l.google.com:19302'] }, */
/*
    { 
      urls: "stun:pipe.puscii.nl" 
    },
    {
      urls: "turn:pipe.puscii.nl?transport=tcp",
      username: "turnuser",
      credential: "verysecretpassword"
    },
    
      
    {
      urls: "turn:pipe.puscii.nl?transport=udp",
      username: "turnuser",
      credential: "verysecretpassword"
    },


    {
      urls: "turns:pipe.puscii.nl?transport=tcp",
      username: "turnuser",
      credential: "verysecretpassword"
    },
    
      
    {
      urls: "turns:pipe.puscii.nl?transport=udp",
      username: "turnuser",
      credential: "verysecretpassword"
    },
*/

    
  ]
};

