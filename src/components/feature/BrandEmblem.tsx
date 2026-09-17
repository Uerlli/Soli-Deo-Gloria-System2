const EMBLEM_URL =
  "https://storage.helloreaddy.io/project_files/27b229dd-1f4d-4510-9cef-b66347b8923c/93a72fe0-28f7-49e8-a375-d87d1a884410_compressed_sdg2.webp";

/**
 * Soli Deo Gloria emblem + wordmark.
 *
 * The artwork is used as a CSS mask and filled with `currentColor`, so it
 * inherits the brand palette (kept in the warm coffee tone to stay harmonious
 * with the main logo on the opposite side of the header).
 *
 * The mask is aligned to the right edge and scaled with `contain`, which keeps
 * the original proportions of the logo intact regardless of the container width.
 */
interface BrandEmblemProps {
  heightClass?: string;
  colorClass?: string;
  widthClass?: string;
  className?: string;
  alt?: string;
}

export default function BrandEmblem({
  heightClass = "h-12",
  colorClass = "text-foreground-950",
  widthClass = "w-28 md:w-36",
  className = "",
  alt = "Soli Deo Gloria",
}: BrandEmblemProps) {
  return (
    <span
      role="img"
      aria-label={alt}
      title={alt}
      className={`inline-block shrink-0 bg-current ${colorClass} ${heightClass} ${widthClass} ${className}`}
      style={{
        WebkitMaskImage: `url("${EMBLEM_URL}")`,
        maskImage: `url("${EMBLEM_URL}")`,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "right center",
        maskPosition: "right center",
        WebkitMaskSize: "contain",
        maskSize: "contain",
      }}
    />
  );
}