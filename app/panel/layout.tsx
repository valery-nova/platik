import { AppShell } from "@/components/shell";
import { OnboardingMoneda } from "@/components/onboarding";
import { BetaSetup } from "@/components/beta-setup";
import { PlatikProvider } from "@/lib/store";

export default function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PlatikProvider>
      <AppShell>{children}</AppShell>
      <OnboardingMoneda />
      <BetaSetup />
    </PlatikProvider>
  );
}
