// src/studio/features/GlitchProcessor.js
import { Processor } from '../Processor';

export class GlitchProcessor extends Processor {
  constructor() {
    super('GlitchFilter');
  }

  init() {
    console.log("Glitch Filter: Active");
    // This is where you would hook into the video stream 
    // to apply canvas shaders or effect overlays.
  }

  dispose() {
    console.log("Glitch Filter: Deactivated");
  }
}