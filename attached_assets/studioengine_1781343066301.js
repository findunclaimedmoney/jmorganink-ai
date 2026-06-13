/* Powered by LensFlow | Architect: Gemini AI */
import * as THREE from 'three';

export class StudioEngine {
  constructor() {
    this.stream = null;
    this.recorder = null;
    this.chunks = [];
    this.activeProcessor = null;
    this.status = 'IDLE'; // IDLE, INITIALIZING, RUNNING, ERROR
  }

  async initHardware(constraints = { video: true, audio: true }) {
    try {
      this.status = 'INITIALIZING';
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.status = 'RUNNING';
      return this.stream;
    } catch (err) {
      this.status = 'ERROR';
      console.error("StudioEngine: Hardware init failed", err);
      throw err;
    }
  }

  setProcessor(processor) {
    if (this.activeProcessor) {
      console.log(`Disposing ${this.activeProcessor.name}`);
      this.activeProcessor.dispose();
    }
    this.activeProcessor = processor;
    console.log(`Activating ${this.activeProcessor.name}`);
    this.activeProcessor.init();
  }

  record() {
    if (!this.stream) throw new Error("No stream found. Call initHardware first.");
    this.chunks = [];
    this.recorder = new MediaRecorder(this.stream);
    this.recorder.ondataavailable = (e) => this.chunks.push(e.data);
    this.recorder.start();
    this.status = 'RECORDING';
  }

  async stopAndSave() {
    return new Promise((resolve) => {
      this.recorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: 'video/webm' });
        this.status = 'RUNNING';
        resolve(URL.createObjectURL(blob));
      };
      this.recorder.stop();
    });
  }
}