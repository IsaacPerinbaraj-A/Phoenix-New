// API client with a buffered SSE parser: events remain correct even when
// network chunks split between event boundaries.

export async function getHealth() {
  const resp = await fetch("/api/health");
  if (!resp.ok) throw new Error("Health check failed");
  return resp.json();
}

export async function getCases() {
  const resp = await fetch("/api/cases");
  if (!resp.ok) throw new Error("Failed to load cases");
  return resp.json();
}

export async function getCase(caseId) {
  const resp = await fetch(`/api/cases/${caseId}`);
  if (!resp.ok) throw new Error("Case not found");
  return resp.json();
}

/**
 * Submit a case and invoke onEvent(parsedEvent) for every SSE event.
 * Resolves when the stream ends; rejects on network/HTTP errors.
 */
export async function submitCase({ imageFile, questionnaire, language, onEvent }) {
  const form = new FormData();
  if (imageFile) form.append("image", imageFile);
  form.append("questionnaire", JSON.stringify(questionnaire));
  form.append("language", language || "en");

  const resp = await fetch("/api/assess", { method: "POST", body: form });
  if (!resp.ok) {
    let detail = `Request failed (${resp.status})`;
    try {
      const body = await resp.json();
      if (body.detail) detail = String(body.detail);
    } catch {
      /* keep default message */
    }
    throw new Error(detail);
  }
  if (!resp.body) throw new Error("Streaming not supported by this browser");

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const flush = (chunkText) => {
    buffer += chunkText;
    // SSE events are separated by a blank line.
    let sep;
    while ((sep = buffer.indexOf("\n\n")) !== -1) {
      const rawEvent = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      for (const line of rawEvent.split("\n")) {
        if (line.startsWith("data: ")) {
          try {
            onEvent(JSON.parse(line.slice(6)));
          } catch {
            // Malformed event payload: surface as a stream error event.
            onEvent({ error: true, message: "Malformed response from server." });
          }
        }
      }
    }
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    flush(decoder.decode(value, { stream: true }));
  }
  flush(decoder.decode());
}
