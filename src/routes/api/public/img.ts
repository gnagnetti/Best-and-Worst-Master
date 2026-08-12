import { createFileRoute } from "@tanstack/react-router";

const BLOCKED =
  /^(localhost$|127\.|0\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?$|.*\.local$|.*\.internal$)/i;

export const Route = createFileRoute("/api/public/img")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const raw = new URL(request.url).searchParams.get("url");
        if (!raw) return new Response("Missing url", { status: 400 });

        let target: URL;
        try {
          target = new URL(raw);
        } catch {
          return new Response("Invalid url", { status: 400 });
        }
        if (target.protocol !== "https:" || BLOCKED.test(target.hostname))
          return new Response("Forbidden url", { status: 403 });

        const upstream = await fetch(target.toString());
        if (!upstream.ok) return new Response("Upstream error", { status: 502 });

        const type = upstream.headers.get("content-type") ?? "";
        if (!type.startsWith("image/")) return new Response("Not an image", { status: 415 });

        return new Response(upstream.body, {
          headers: {
            "content-type": type,
            "cache-control": "public, max-age=86400",
            "access-control-allow-origin": "*",
          },
        });
      },
    },
  },
});
