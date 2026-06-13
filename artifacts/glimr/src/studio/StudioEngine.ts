import { Processor } from './Processor';

export class StudioEngine {
  stream: MediaStream | null = null;
  recorder: MediaRecorder | null = null;
  chunks: Blob[] = [];
  activeProcessor: Processor | null = null;
  status: 'IDLE' | 'INITIALIZING' | 'RUNNING' | 'RECORDING' | 'ERROR' = 'IDLE';

  async initHardware(constraints: MediaStreamConstraints = { video: true, audio: true }): Promise<MediaStream> {
    try {
      this.status = 'INITIALIZING';
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.status = 'RUNNING';
      return this.stream;
    } catch (err) {
      this.status = 'ERROR';
      console.error('StudioEngine: Hardware init failed', err);
      throw err;
    }
  }

  setProcessor(processor: Processor): void {
    if (this.activeProcessor) {
      console.log(`Disposing ${this.activeProcessor.name}`);
      this.activeProcessor.dispose();
    }
    this.activeProcessor = processor;
    console.log(`Activating ${this.activeProcessor.name}`);
    this.activeProcessor.init();
  }

  record(): void {
    if (!this.stream) throw new Error('No stream found. Call initHardware first.');
    this.chunks = [];
    this.recorder = new MediaRecorder(this.stream);
    this.recorder.ondataavailable = (e) => this.chunks.push(e.data);
    this.recorder.start();
    this.status = 'RECORDING';
  }

  async stopAndSave(): Promise<string> {
    return new Promise((resolve) => {
      if (!this.recorder) throw new Error('No recorder active.');
      this.recorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: 'video/webm' });
        this.status = 'RUNNING';
        resolve(URL.createObjectURL(blob));
      };
      this.recorder.stop();
    });
  }
}
