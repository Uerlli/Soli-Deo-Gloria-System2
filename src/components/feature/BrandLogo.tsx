const LOGO_URL =
  "https://storage.helloreaddy.io/project_files/27b229dd-1f4d-4510-9cef-b66347b8923c/50b15f4e-1eaf-4ce7-a7dd-bb7f93c83667_compressed_sdg.webp";

/**
 * Renders the Café Soli Deo Gloria logo (original transparent artwork)
 * tinted with the current brand color, so it stays crisp and matches the
 * token palette on both light and dark surfaces.
 *
 * The transparent logo is used as a CSS mask, then filled with `currentColor`.
 * Height is controlled via `heightClass`; width follows the logo aspect ratio.
 */
interface BrandLogoProps {
  heightClass?: string;
  colorClass?: string;
  className?: string;
  alt?: string;
}

export default function BrandLogo({
  heightClass = "h-16",
  colorClass = "text-foreground-950",
  className = "",
  alt = "Café Soli Deo Gloria",
}: BrandLogoProps) {
  return (
    <span
      role="img"
      aria-label={alt}
      title={alt}
      className={`inline-block shrink-0 bg-current ${colorClass} ${heightClass} ${className}`}
      style={{
        aspectRatio: "470 / 367",
        WebkitMaskImage: `url("${LOGO_URL}")`,
        maskImage: `url("${LOGO_URL}")`,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        WebkitMaskSize: "contain",
        maskSize: "contain",
      }}
    />
  );
}