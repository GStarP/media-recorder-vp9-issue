<template>
  <div id="app">
    <video ref="localVideo" class="local-video" autoplay></video>
    <video ref="remoteVideo" class="remote-video" autoplay></video>
    <div>{{ role }}</div>
    <button @click="getReady">READY</button>
    <button @click="recordRemote">RECORD</button>
    <button @click="showStats">STATS</button>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { record } from "./record";

const localVideo = ref<HTMLVideoElement>();
const remoteVideo = ref<HTMLVideoElement>();

let pc: RTCPeerConnection | null = null;
let localStream: MediaStream | null = null;
let remoteStream: MediaStream | null = null;

let role = ref("sender");

const server = new BroadcastChannel("webrtc");
server.onmessage = async (e) => {
  if (!localStream) return;
  if (e.data.type === "ready") {
    if (pc) return;
    await createOffer();
  } else if (e.data.type === "offer") {
    await createAnswer(e.data.payload);
  } else if (e.data.type === "answer") {
    await recvAnswer(e.data.payload);
  } else if (e.data.type === "candidate") {
    await recvCandidate(e.data.payload);
  }
};

async function getReady() {
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: true,
    audio: false,
  });
  localStream = stream;
  localVideo.value!.srcObject = localStream;
  server.postMessage({
    type: "ready",
  });
}

async function createPC() {
  const pc = new RTCPeerConnection();
  const tracks = localStream?.getVideoTracks();
  if (!tracks) {
    console.error("no track");
    return;
  }
  for (const track of tracks) {
    pc.addTrack(track, localStream!);
  }
  setCodecs(pc, "VP9");
  pc.onicecandidate = (e) => {
    if (e.candidate) {
      console.log("ice", e.candidate);
      server.postMessage({
        type: "candidate",
        payload: JSON.stringify(e.candidate),
      });
    }
  };
  pc.ontrack = (e) => {
    if (e.streams && e.streams[0]) {
      remoteStream = e.streams[0];
      remoteVideo.value!.srcObject = remoteStream;
    }
  };
  return pc;
}

async function createOffer() {
  if (pc) return;
  console.log("create offer");
  role.value = "sender";
  pc = (await createPC()) as RTCPeerConnection;
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  server.postMessage({
    type: "offer",
    payload: JSON.stringify(offer),
  });
}

async function createAnswer(payload: string) {
  if (pc) return;
  console.log("create answer", payload);
  role.value = "receiver";
  pc = (await createPC()) as RTCPeerConnection;
  const offer = JSON.parse(payload);
  await pc.setRemoteDescription(offer);
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  server.postMessage({
    type: "answer",
    payload: JSON.stringify(answer),
  });
}

async function recvAnswer(payload: string) {
  if (!pc) return;
  console.log("recv answer", payload);
  const answer = JSON.parse(payload);
  await pc?.setRemoteDescription(answer);
}

async function recvCandidate(payload: string) {
  if (!pc) return;
  console.log("recv candidate", payload);
  const candidate = JSON.parse(payload);
  await pc?.addIceCandidate(candidate);
}

function recordRemote() {
  record(remoteVideo.value!, 5000, role.value);
}

function setCodecs(pc: RTCPeerConnection, codec: string) {
  const { codecs } = RTCRtpSender.getCapabilities("video")!;
  console.log("supported codecs", codecs);
  const updatedCodecs: RTCRtpCodecCapability[] = [];
  codecs.forEach((c) => {
    if (c.mimeType.includes(codec)) {
      updatedCodecs.push(c);
    }
  });
  const transceiver = pc
    .getTransceivers()
    .find((t) => t.sender.track === localStream?.getVideoTracks()[0]);
  if (transceiver) {
    console.log("updated codecs", updatedCodecs);
    transceiver.setCodecPreferences(updatedCodecs);
  }
}

function showStats() {
  pc!.getStats().then((stats) => {
    stats.forEach((stat) => {
      if (stat.type === "outbound-rtp") {
        console.log((stats as any).get(stat.codecId));
      }
    });
  });
}
</script>
