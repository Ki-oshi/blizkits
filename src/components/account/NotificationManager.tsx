"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle2, AlertCircle, Bell } from "lucide-react";

interface NotificationManagerProps {
  initialSettings: any;
}

export default function NotificationManager({ initialSettings }: NotificationManagerProps) {
  const [settings, setSettings] = useState(initialSettings || {
    order_updates: true,
    drop_alerts: true,
    promotions: true,
  });
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);

  const supabase = createClient();

  const handleToggle = async (field: string, currentValue: boolean) => {
    const updatedValue = !currentValue;
    const newSettingsState = { ...settings, [field]: updatedValue };
    setSettings(newSettingsState);
    setMessage(null);

    startTransition(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Upsert preferences (inserts if row doesn't exist yet, updates if it does)
      const { error } = await supabase
        .from("user_notifications")
        .upsert({
          user_id: user.id,
          ...newSettingsState,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

      if (error) {
        setMessage({ type: "error", text: `Failed to save: ${error.message}` });
        // Revert local state on error
        setSettings(settings);
      } else {
        setMessage({ type: "success", text: "Preferences updated automatically!" });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-neutral-100 pb-4">
        <h2 className="text-xl font-bold text-neutral-900">Notification Preferences</h2>
        <p className="text-xs text-neutral-500 mt-1">Choose what updates you want to receive across devices.</p>
      </div>

      {message && (
        <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
          message.type === "success" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-red-50 text-red-800 border-red-200"
        }`}>
          {message.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />} 
          {message.text}
        </div>
      )}

      <div className="space-y-4 pt-2">
        {[
          { field: "order_updates", title: "Order Status Updates", desc: "Get notified when your items ship or are delivered." },
          { field: "drop_alerts", title: "New Drop Alerts", desc: "Be the first to know when new phone charms & keychains launch." },
          { field: "promotions", title: "Promotions & Discounts", desc: "Receive exclusive discount codes and seasonal sale notices." },
        ].map((item) => {
          const isChecked = !!settings[item.field];
          return (
            <div key={item.field} className="flex items-center justify-between p-4 rounded-xl border border-neutral-200 bg-neutral-50/50">
              <div>
                <p className="text-sm font-bold text-neutral-900">{item.title}</p>
                <p className="text-xs text-neutral-500 mt-0.5">{item.desc}</p>
              </div>
              <input 
                type="checkbox" 
                checked={isChecked}
                disabled={isPending}
                onChange={() => handleToggle(item.field, isChecked)}
                className="h-4 w-4 accent-pink-500 rounded cursor-pointer" 
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}