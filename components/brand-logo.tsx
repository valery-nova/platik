const SRC = {
  "without-slogan": {
    light: "/brand/logos/logo-without-slogan-light.png",
    dark: "/brand/logos/logo-without-slogan-dark.png",
  },
  "with-slogan": {
    light: "/brand/logos/logo-with-slogan-light.png",
    dark: "/brand/logos/logo-with-slogan-dark.png",
  },
} as const;

export type BrandLogoVariant = keyof typeof SRC;

/** Logo oficial: cambia automáticamente entre la versión clara y la oscura. */
export function BrandLogo({
  variant = "without-slogan",
  className = "",
  priority = false,
}: {
  variant?: BrandLogoVariant;
  className?: string;
  priority?: boolean;
}) {
  const src = SRC[variant];
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src.light} alt="PLATIK" className={`logo-light ${className}`} {...(priority ? { fetchPriority: "high" as const } : {})} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src.dark} alt="PLATIK" className={`logo-dark ${className}`} aria-hidden="true" />
    </>
  );
}
