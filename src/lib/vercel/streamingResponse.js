// Streaming helpers for Vercel - send data as it's available instead of buffering

export async function* streamJSON(dataGenerator) {
  yield '[\n';
  let first = true;

  for await (const item of dataGenerator) {
    if (!first) yield ',\n';
    yield JSON.stringify(item);
    first = false;
  }

  yield '\n]';
}

export async function streamJSONResponse(dataGenerator) {
  const stream = streamJSON(dataGenerator);
  const encoder = new TextEncoder();

  return new Response(
    new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            controller.enqueue(encoder.encode(chunk));
            // Yield to event loop to allow other requests to process
            await new Promise(resolve => setTimeout(resolve, 0));
          }
        } catch (error) {
          console.error('[Stream] Error:', error.message);
          controller.error(error);
        } finally {
          controller.close();
        }
      },
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    }
  );
}

export async function* streamNDJSON(dataGenerator) {
  for await (const item of dataGenerator) {
    yield JSON.stringify(item) + '\n';
  }
}

export async function streamNDJSONResponse(dataGenerator) {
  const stream = streamNDJSON(dataGenerator);
  const encoder = new TextEncoder();

  return new Response(
    new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            controller.enqueue(encoder.encode(chunk));
            await new Promise(resolve => setTimeout(resolve, 0));
          }
        } catch (error) {
          console.error('[Stream] Error:', error.message);
          controller.error(error);
        } finally {
          controller.close();
        }
      },
    }),
    {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    }
  );
}
