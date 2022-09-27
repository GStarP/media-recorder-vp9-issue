# MediaRecorder VP9 Issue

Based on [WebRTC samples - Peer connection between two tabs](https://webrtc.github.io/samples/src/content/peerconnection/channel/).

## Quick Start

```bash
pnpm install
pnpm dev
```

Click `ready` buttons in both tabs, then click `record` button at receiver side.

You can click `stats` button to see whether the RTCPeerconnection uses VP9 codec indeed.

## Issue Description

If you add `transeiver.setCodePreferences` in order to use VP9 codec, then your MediaRecorder at receiver side will record a broken video.

By the way, if you `console.log(e.data.size)` in ondataavailable callback, you will see that blobs recorded at receiver side are quite small, for example 3000, while those at sender side can be up to 100000. I think this is where the problem lies.
