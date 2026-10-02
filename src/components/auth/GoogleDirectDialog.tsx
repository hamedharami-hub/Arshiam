import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, UserCheck, ArrowRight } from "lucide-react";

interface GoogleDirectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectAccount: (email: string, name?: string) => Promise<void>;
  loading?: boolean;
}

export default function GoogleDirectDialog({
  open,
  onOpenChange,
  onSelectAccount,
  loading = false,
}: GoogleDirectDialogProps) {
  const [customEmail, setCustomEmail] = useState("");
  const [customName, setCustomName] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  // Suggested quick account
  const defaultAccount = {
    email: "hamed.harami@gmail.com",
    name: "Hamed Harami",
  };

  const handleQuickSelect = async () => {
    await onSelectAccount(defaultAccount.email, defaultAccount.name);
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail.trim()) return;
    await onSelectAccount(customEmail.trim(), customName.trim());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-md p-6 rounded-2xl sm:rounded-2xl border bg-card text-card-foreground shadow-2xl">
        <DialogHeader className="text-right space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">ورود مستقیم با حساب گوگل</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                انتخاب حساب برای ورود بدون وقفه و همگام‌سازی ابری Firebase
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Default recommended account button */}
          <button
            type="button"
            onClick={handleQuickSelect}
            disabled={loading}
            className="w-full flex items-center justify-between p-3.5 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all text-right group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">
                H
              </div>
              <div>
                <p className="font-semibold text-sm leading-tight text-foreground flex items-center gap-1.5">
                  {defaultAccount.name}
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                </p>
                <p dir="ltr" className="text-xs text-muted-foreground text-right font-mono mt-0.5">
                  {defaultAccount.email}
                </p>
              </div>
            </div>
            <span className="text-xs font-medium text-primary flex items-center gap-1 group-hover:translate-x-[-2px] transition-transform">
              ورود سریع
              <ArrowRight className="w-3.5 h-3.5 rotate-180" />
            </span>
          </button>

          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-card px-2 text-muted-foreground">یا استفاده از ایمیل گوگل دیگر</span>
            </div>
          </div>

          {!showCustom ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowCustom(true)}
              className="w-full text-xs"
            >
              <UserCheck className="w-3.5 h-3.5 ms-2" />
              ورود با آدرس جیمیل دیگر
            </Button>
          ) : (
            <form onSubmit={handleCustomSubmit} className="space-y-3 p-3 border rounded-xl bg-muted/20">
              <div>
                <Label htmlFor="custom-name" className="text-xs">نام نمایشی (اختیاری)</Label>
                <Input
                  id="custom-name"
                  placeholder="مثال: علی رضایی"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="text-sm mt-1"
                />
              </div>
              <div>
                <Label htmlFor="custom-email" className="text-xs">آدرس Gmail</Label>
                <Input
                  id="custom-email"
                  type="email"
                  required
                  placeholder="user@gmail.com"
                  dir="ltr"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  className="text-sm font-mono mt-1"
                />
              </div>
              <Button type="submit" size="sm" className="w-full text-xs" disabled={loading}>
                {loading ? "در حال ورود..." : "تأیید و ورود"}
              </Button>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
