"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { Lock, AlertTriangle, CheckCircle2, AlertCircle, ShieldCheck } from "lucide-react";

export default function SettingsManager() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Re-authentication state
  const [isVerified, setIsVerified] = useState(false);
  const [currentPasswordInput, setCurrentPasswordInput] = useState("");
  const [verifying, setVerifying] = useState(false);

  const supabase = createClient();

  const handleVerifyIdentity = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);
    setVerifying(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !user.email) {
      setMessage({ type: "error", text: "Session error. Please log in again." });
      setVerifying(false);
      return;
    }

    // Verify current password by attempting a test sign-in
    const { error } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPasswordInput,
    });

    if (error) {
      setMessage({ type: "error", text: "Incorrect current password. Please try again." });
      setVerifying(false);
    } else {
      setIsVerified(true);
      setVerifying(false);
      setMessage({ type: "success", text: "Identity verified successfully. You may now update your password." });
    }
  };

  const handlePasswordChange = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);
    const formData = new FormData(e.currentTarget);
    const newPassword = formData.get("newPassword") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "New passwords do not match." });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: "error", text: "Password must be at least 6 characters long." });
      return;
    }

    startTransition(async () => {
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) {
        setMessage({ type: "error", text: error.message });
      } else {
        setMessage({ type: "success", text: "Password updated successfully!" });
        setIsVerified(false); // Lock verification state again for future security
        setCurrentPasswordInput("");
        (e.target as HTMLFormElement).reset();
      }
    });
  };

  const handleDeleteAccount = async () => {
    setMessage(null);
    startTransition(async () => {
      const { error } = await supabase.auth.signOut();
      if (error) {
        setMessage({ type: "error", text: error.message });
      } else {
        router.push("/login?message=Account session terminated.");
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-neutral-100 pb-4">
        <h2 className="text-xl font-bold text-neutral-900">Account Settings</h2>
        <p className="text-xs text-neutral-500 mt-1">Manage security credentials and identity validation controls.</p>
      </div>

      {message && (
        <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
          message.type === "success" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-red-50 text-red-800 border-red-200"
        }`}>
          {message.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />} 
          {message.text}
        </div>
      )}

      {/* Password Change / Re-authentication Section */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-pink-500" />
            <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">Change Password</h3>
          </div>
          {isVerified && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              <ShieldCheck className="h-3.5 w-3.5" /> Verified Owner
            </span>
          )}
        </div>

        {!isVerified ? (
          <form onSubmit={handleVerifyIdentity} className="space-y-3 pt-2">
            <p className="text-xs text-neutral-600">For your security, please enter your current password to proceed with updates.</p>
            <div>
              <label className="block text-xs font-bold text-neutral-800 mb-1">Current Password</label>
              <input 
                type="password" 
                required 
                value={currentPasswordInput || ""} 
                onChange={(e) => setCurrentPasswordInput(e.target.value)}
                placeholder="••••••••" 
                className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-neutral-900 outline-none focus:ring-2 focus:ring-pink-500" 
              />
            </div>
            <div className="pt-2">
              <Button type="submit" disabled={verifying} size="sm" className="bg-neutral-900 hover:bg-neutral-800 text-white cursor-pointer">
                {verifying ? "Verifying Identity..." : "Verify Identity"}
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handlePasswordChange} className="space-y-3 pt-2">
            <div>
              <label className="block text-xs font-bold text-neutral-800 mb-1">New Password</label>
              <input 
                type="password" 
                name="newPassword" 
                required 
                placeholder="••••••••" 
                className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-neutral-900 outline-none focus:ring-2 focus:ring-pink-500" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-800 mb-1">Confirm New Password</label>
              <input 
                type="password" 
                name="confirmPassword" 
                required 
                placeholder="••••••••" 
                className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-neutral-900 outline-none focus:ring-2 focus:ring-pink-500" 
              />
            </div>
            <div className="pt-2 flex items-center gap-2">
              <Button type="submit" disabled={isPending} size="sm" className="bg-pink-500 hover:bg-pink-600 text-white cursor-pointer">
                {isPending ? "Updating Password..." : "Save New Password"}
              </Button>
              <Button type="button" onClick={() => setIsVerified(false)} variant="outline" size="sm" className="text-neutral-600 border-neutral-300 cursor-pointer">
                Cancel
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* Danger Zone Section */}
      <div className="rounded-2xl border border-red-200 bg-red-50/30 p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <h3 className="text-sm font-bold text-red-900 uppercase tracking-wider">Danger Zone</h3>
        </div>
        
        <p className="text-xs text-neutral-600 leading-relaxed">
          Logging out or terminating your active session clears your local credentials. For permanent data deletion requests, please contact support.
        </p>

        {!showDeleteConfirm ? (
          <div>
            <Button 
              type="button" 
              onClick={() => setShowDeleteConfirm(true)} 
              variant="outline" 
              size="sm" 
              className="text-red-600 border-red-300 hover:bg-red-100 cursor-pointer"
            >
              Sign Out / Close Session
            </Button>
          </div>
        ) : (
          <div className="space-y-3 pt-2 border-t border-red-200">
            <p className="text-xs font-bold text-red-800">Are you sure you want to sign out of your account?</p>
            <div className="flex items-center gap-2">
              <Button 
                type="button" 
                onClick={handleDeleteAccount} 
                disabled={isPending}
                size="sm" 
                className="bg-red-600 hover:bg-red-700 text-white cursor-pointer"
              >
                {isPending ? "Processing..." : "Yes, Sign Out"}
              </Button>
              <Button 
                type="button" 
                onClick={() => setShowDeleteConfirm(false)} 
                variant="outline" 
                size="sm" 
                className="text-neutral-700 border-neutral-300 cursor-pointer"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}