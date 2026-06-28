export default async function handler(req, res) {
  const serverModule = await import("../dist/server/server.js");
  const server = serverModule.default ?? serverModule;

  const url = new URL(req.url || "/", `https://${req.headers.host || "localhost"}`);
  const request = new Request(url.toString(), {
    method: req.method,
    headers: req.headers,
    body: req.method !== "GET" && req.method !== "HEAD" ? req : undefined,
  });

  const response = await server.fetch(request, undefined, undefined);
  const buffer = Buffer.from(await response.arrayBuffer());

  res.statusCode = response.status;
  for (const [key, value] of response.headers) {
    if (key.toLowerCase() === "transfer-encoding") continue;
    res.setHeader(key, value);
  }
  res.setHeader("content-length", buffer.length);
  res.end(buffer);
}
