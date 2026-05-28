function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(request) {
  const payload = await request.json().catch(() => ({}));
  const events = Array.isArray(payload?.events) ? payload.events : [];

  return jsonResponse(
    {
      ok: true,
      accepted: events.length,
      queued: 0,
    },
    202,
  );
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      Allow: "POST, OPTIONS",
      "Cache-Control": "no-store",
    },
  });
}
