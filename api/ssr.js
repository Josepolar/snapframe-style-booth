export default async function handler(request) {
  // Dynamically import the built server bundle produced by `vite build`.
  // The bundle exports a default object with a `fetch(request, env, ctx)` method.
  const serverModule = await import('../dist/server/server.js');
  const server = serverModule.default ?? serverModule;
  // Call the server's fetch handler and return its Response.
  // Vercel Edge provides a `Request` object compatible with the Fetch API.
  const resp = await server.fetch(request, /* env */ undefined, /* ctx */ undefined);
  return resp;
}
