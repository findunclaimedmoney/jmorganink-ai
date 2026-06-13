/* Powered by LensFlow | Architect: Gemini AI */
export class Processor {
  constructor(name) {
    this.name = name;
  }
  init() { console.log(`Processor ${this.name} initialized.`); } 
  dispose() { console.log(`Processor ${this.name} disposed.`); }
}