import { AppShell } from "@/components/shell";
import { PlatikProvider } from "@/lib/store";

export default function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PlatikProvider>
      <AppShell>{children}</AppShell>
    </PlatikProvider>
  );
}
