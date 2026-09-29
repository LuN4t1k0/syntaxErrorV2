import { ErrorGlitch } from "@/components/error-glitch";

export function NotFoundGlitch({
  eyebrow,
  title,
  description,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
}: {
  eyebrow: string;
  title: string;
  description: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <ErrorGlitch
      code="404"
      eyebrow={eyebrow}
      title={title}
      description={description}
      homeHref={primaryHref}
      homeLabel={primaryLabel}
      secondaryHref={secondaryHref}
      secondaryLabel={secondaryLabel}
    />
  );
}
