import { ExternalLink } from "lucide-react";

interface OriginButtonProps {
  url: string;
  onMissing: (message?: string) => void;
  label?: string;
}

export function OriginButton({ url, onMissing, label = "Abrir origem" }: OriginButtonProps) {
  function openOrigin() {
    const normalizedUrl = normalizeOriginUrl(url);

    if (normalizedUrl.status === "empty") {
      onMissing();
      return;
    }

    if (normalizedUrl.status === "invalid") {
      onMissing("O link de origem cadastrado não parece válido.");
      return;
    }

    window.open(normalizedUrl.url, "_blank", "noopener,noreferrer");
  }

  return (
    <button className="ghost-button" type="button" onClick={openOrigin}>
      <ExternalLink size={16} />
      <span>{label}</span>
    </button>
  );
}

export function normalizeOriginUrl(value: string):
  | { status: "empty" }
  | { status: "invalid" }
  | { status: "valid"; url: string } {
  const trimmed = value.trim();
  if (!trimmed) return { status: "empty" };
  if (/\s/.test(trimmed)) return { status: "invalid" };

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(withProtocol);
    const hasAllowedProtocol = parsed.protocol === "http:" || parsed.protocol === "https:";
    const host = parsed.hostname.toLowerCase();
    const looksLikeHost = host === "localhost" || host.includes(".") || /^\d{1,3}(\.\d{1,3}){3}$/.test(host);

    if (!hasAllowedProtocol || !looksLikeHost) return { status: "invalid" };
    return { status: "valid", url: parsed.toString() };
  } catch {
    return { status: "invalid" };
  }
}
