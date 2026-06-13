import { Processor } from '../Processor';

export class GlitchProcessor extends Processor {
  constructor() {
    super('GlitchFilter');
  }

  init(): void {
    console.log('Glitch Filter: Active');
  }

  dispose(): void {
    console.log('Glitch Filter: Deactivated');
  }
}
