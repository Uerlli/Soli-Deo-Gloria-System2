import BrandLogo from "@/components/feature/BrandLogo";

interface BrandMarkProps {
  size?: "sm" | "md" | "lg";
  tone?: "dark" | "light";
  showSubtitle?: boolean;
}

const heightMap = {
  sm: "h-9",
  md: "h-14",
  lg: "h-24",
};

export default function BrandMark({ size = "md", tone = "dark" }: BrandMarkProps) {
  const colorClass =
    tone === "dark" ? "text-foreground-950" : "text-background-50";

  return (
    <div className="flex select-none items-center justify-center">
      <BrandLogo heightClass={heightMap[size]} colorClass={colorClass} />
    </div>
  );
}