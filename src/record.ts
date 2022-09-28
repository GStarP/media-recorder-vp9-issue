export function record(
  videoEl: HTMLVideoElement,
  duration: number,
  filename: string
) {
  const recorder = new MediaRecorder(videoEl.srcObject as MediaStream);
  console.log("recording", videoEl.srcObject, "codecs:", recorder.mimeType);
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) {
      console.debug(e.data);
      chunks.push(e.data);
    }
  };
  recorder.onstop = () => {
    downloadBlob(new Blob(chunks), filename);
  };
  recorder.start(0);

  setTimeout(() => {
    recorder.stop();
  }, duration);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.webm`;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
