import { SpanBuffer } from "../span-buffer.js";
import { AuaTracer } from "../tracer.js";
import type { AuaSpan } from "../span-schema.js";

function makeTracer(sensitiveIds: Set<string> = new Set(), maxSize = 500) {
  const buffer = new SpanBuffer(maxSize);
  const tracer = new AuaTracer(buffer, () => sensitiveIds);
  return { buffer, tracer };
}

describe("AuaTracer", () => {
  test("sensitive element span without redacted flag is dropped", () => {
    const { buffer, tracer } = makeTracer(new Set(["el-1"]));
    const span = tracer.startSpan("aua.barrier.detect", {
      "aua.session_id": "s1",
      "aua.page_id": "p1",
    });
    span.attributes["aua.element_id"] = "el-1";
    tracer.endSpan(span, "ok");

    expect(buffer.size()).toBe(0);
    expect(tracer.getDroppedCount()).toBe(1);
  });

  test("clean span with no sensitive element is buffered", () => {
    const { buffer, tracer } = makeTracer(new Set(["el-secret"]));
    const span = tracer.startSpan("aua.skill.execute", {
      "aua.session_id": "s2",
      "aua.page_id": "p2",
    });
    tracer.endSpan(span, "ok");

    expect(buffer.size()).toBe(1);
    expect(tracer.getDroppedCount()).toBe(0);
  });

  test("buffer overflow drops the oldest span", () => {
    const { buffer, tracer } = makeTracer(new Set(), 3);
    const names = [
      "aua.barrier.detect",
      "aua.skill.execute",
      "aua.adaptation.plan",
      "aua.voice.turn",
    ] as const;

    for (const name of names) {
      const span = tracer.startSpan(name, {
        "aua.session_id": "s3",
        "aua.page_id": "p3",
      });
      tracer.endSpan(span, "ok");
    }

    expect(buffer.size()).toBe(3);
    const flushed = buffer.flush();
    expect(flushed[0]?.name).toBe("aua.skill.execute");
    expect(flushed[2]?.name).toBe("aua.voice.turn");
  });

  test("tracer never throws even on a malformed span object", () => {
    const { tracer } = makeTracer();
    expect(() => {
      tracer.endSpan({} as AuaSpan, "error");
    }).not.toThrow();
  });
});
