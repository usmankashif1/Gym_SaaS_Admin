import { AppGate } from "@/features/auth/AppGate";
import { AuthProvider } from "@/features/auth/AuthProvider";

export default function RootLayout() {
  return (
    <AuthProvider>
      <AppGate />
    </AuthProvider>
  );
}
