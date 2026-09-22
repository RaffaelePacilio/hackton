import type { AuaSpan } from "./span-schema.js";

export class SpanBuffer {
  private readonly buffer: AuaSpan[] = [];
  private readonly maxSize: number;

  constructor(maxSize = 500) {
    this.maxSize = maxSize;
  }

  record(span: AuaSpan): void {
    if (this.buffer.length >= this.maxSize) {
      this.buffer.shift();
    }
    this.buffer.push(span);
  }

  flush(): AuaSpan[] {
    return this.buffer.splice(0);
  }

  size(): number {
    return this.buffer.length;
  }
}
