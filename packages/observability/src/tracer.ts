import type { AuaSpan, DomainAttributes, SpanName, SpanStatus } from "./span-schema.js";
import type { SpanBuffer } from "./span-buffer.js";
import { validateSpanBeforeIngestion } from "./ingestion-validator.js";

export class AuaTracer {
  private droppedSpans = 0;

  constructor(
    private readonly buffer: SpanBuffer,
    private readonly getSensitiveIds: () => Set<string>
  ) {}

  startSpan(name: SpanName, attributes: DomainAttributes): AuaSpan {
    try {
      return {
        name,
        attributes: { ...attributes } as AuaSpan["attributes"],
        startMs: Date.now(),
        status: "ok",
      };
    } catch {
      return {
        name: "aua.barrier.detect",
        attributes: { "aua.session_id": "", "aua.page_id": "" } as AuaSpan["attributes"],
        startMs: 0,
        status: "error",
      };
    }
  }

  endSpan(span: AuaSpan, status: SpanStatus, error?: string): void {
    try {
      span.endMs = Date.now();
      span.status = status;
      if (error !== undefined) {
        span.error = error;
      }
      const result = validateSpanBeforeIngestion(span, this.getSensitiveIds());
      if (result.valid) {
        this.buffer.record(span);
      } else {
        this.droppedSpans++;
      }
    } catch {
      this.droppedSpans++;
    }
  }

  getDroppedCount(): number {
    return this.droppedSpans;
  }
}
