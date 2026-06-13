export class Processor {
  name: string;

  constructor(name: string) {
    this.name = name;
  }

  init(): void {
    console.log(`Processor ${this.name} initialized.`);
  }

  dispose(): void {
    console.log(`Processor ${this.name} disposed.`);
  }
}
