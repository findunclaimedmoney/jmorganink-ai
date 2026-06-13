import * as THREE from 'three';

export class StudioEngine {
  constructor() {
    this.stream = null;
    this.recorder = null;
    this.chunks = [];
    this.activeProcessor = null;
  }

  async initHardware() {
    if (this.stream) return this.stream;
    this.stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    return this.stream;
  }

  setProcessor(processor) {
    if (this.activeProcessor) this.activeProcessor.dispose();
    this.activeProcessor = processor;
    this.activeProcessor.init();
  }

  record() {
    this.chunks = [];
    this.recorder = new MediaRecorder(this.stream);
    this.recorder.ondataavailable = (e) => this.chunks.push(e.data);
    this.recorder.start();
  }

  stopAndSave() {
    return new Promise((resolve) => {
      this.recorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: 'video/webm' });
        resolve(URL.createObjectURL(blob));
      };
      this.recorder.stop();
    });
  }
}