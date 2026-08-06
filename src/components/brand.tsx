import Image from "next/image";
import Link from "next/link";

export function CostivraMark({ size = 34 }: { size?: number }) {
  return (
    <Image
      className="costivra-mark"
      src="/brand/costivra-circuit-mark-cropped.png"
      width={size}
      height={size}
      alt=""
      priority
      style={{ width: size, height: size, maxWidth: size, maxHeight: size, objectFit: "contain", flexShrink: 0 }}
    />
  );
}

export function Brand({ light = false, compact = false }: { light?: boolean; compact?: boolean }) {
  return (
    <Link className={`${light ? "logo logo-light" : "logo"}${compact ? " logo-compact" : ""}`} href="/" aria-label="Costivra home">
      <Image className="logo-mark" src="/brand/costivra-circuit-mark-cropped.png" width={40} height={36} alt="" priority />
      <span>Costivra</span>
    </Link>
  );
}
