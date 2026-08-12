import { useEffect, useState } from "react";
import { sanitizeUrl } from "@/lib/garderobe/parse";

/**
 * Async pre-loading image with crossOrigin="anonymous" and a styled fallback
 * frame rendered when the URL is empty, broken (404) or blocked by CORS.
 */
export function SmartImage({
  src,
  alt,
  label,
  className = "",
  frameClassName = "",
}: {
  src: string;
  alt: string;
  label?: string;
  className?: string;
  frameClassName?: string;
}) {
  const url = sanitizeUrl(src);
  // Remote hosts rarely send CORS headers, so load through the same-origin
  // image proxy; fall back to the direct URL if the proxy cannot fetch it.
  const proxied = url ? `/api/public/img?url=${encodeURIComponent(url)}` : "";
  const [resolved, setResolved] = useState(proxied);
  const [status, setStatus] = useState<"loading" | "ok" | "error">(url ? "loading" : "error");

  useEffect(() => {
    if (!url) {
      setStatus("error");
      setResolved("");
      return;
    }
    let alive = true;
    setStatus("loading");
    setResolved(proxied);

    const tryLoad = (candidate: string, onFail: () => void) => {
      const img = new Image();
      img.onload = () => {
        if (!alive) return;
        setResolved(candidate);
        setStatus("ok");
      };
      img.onerror = () => alive && onFail();
      img.src = candidate;
    };

    tryLoad(proxied, () => tryLoad(url, () => setStatus("error")));

    return () => {
      alive = false;
    };
  }, [url, proxied]);

  if (status === "error") {
    return (
      <div
        className={`flex h-full w-full flex-col items-center justify-center gap-1 bg-muted p-1 text-center text-[9px] leading-tight text-muted-foreground ${frameClassName}`}
      >
        {label && <span className="line-clamp-2 font-semibold">{label}</span>}
        <span>No Image Available</span>
      </div>
    );
  }

  return (
    <img
      src={resolved || url}
      alt={alt}
      loading="lazy"
      onError={() => setStatus("error")}
      className={className}
    />
  );
}
