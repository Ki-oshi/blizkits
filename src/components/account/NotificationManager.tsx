"use client";

import {
  useEffect,
  useState,
  useTransition,
} from "react";
import { createClient } from "@/lib/supabase/client";
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  Mail,
} from "lucide-react";

interface NotificationSettings {
  order_updates: boolean;
  drop_alerts: boolean;
  promotions: boolean;
}

type NotificationField =
  keyof NotificationSettings;

interface NotificationManagerProps {
  initialSettings?: Partial<NotificationSettings> | null;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  order_updates: true,
  drop_alerts: true,
  promotions: true,
};

export default function NotificationManager({
  initialSettings,
}: NotificationManagerProps) {
  const [settings, setSettings] =
    useState<NotificationSettings>({
      ...DEFAULT_SETTINGS,
      ...(initialSettings ?? {}),
    });

  const [email, setEmail] =
    useState<string | null>(null);

  const [isPending, startTransition] =
    useTransition();

  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [supabase] = useState(
    () => createClient()
  );

  useEffect(() => {
    let mounted = true;

    async function loadEmail() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) {
        return;
      }

      setEmail(user?.email ?? null);
    }

    void loadEmail();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  const handleToggle = (
    field: NotificationField
  ) => {
    const previousSettings = settings;

    const nextSettings: NotificationSettings = {
      ...settings,
      [field]: !settings[field],
    };

    setSettings(nextSettings);
    setMessage(null);

    startTransition(async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setSettings(previousSettings);

        setMessage({
          type: "error",
          text: "Your session could not be verified. Please sign in again.",
        });

        return;
      }

      const {
        error: saveError,
      } = await supabase
        .from("user_notifications")
        .upsert(
          {
            user_id: user.id,
            ...nextSettings,
            updated_at:
              new Date().toISOString(),
          },
          {
            onConflict: "user_id",
          }
        );

      if (saveError) {
        setSettings(previousSettings);

        setMessage({
          type: "error",
          text: `Failed to save preferences: ${saveError.message}`,
        });

        return;
      }

      setMessage({
        type: "success",
        text: "Notification preferences updated.",
      });
    });
  };

  const options: Array<{
    field: NotificationField;
    title: string;
    desc: string;
  }> = [
    {
      field: "order_updates",
      title: "Order Status Updates",
      desc: "Receive important order and payment updates by email.",
    },
    {
      field: "drop_alerts",
      title: "New Drop Alerts",
      desc: "Be the first to know when new phone charms and keychains launch.",
    },
    {
      field: "promotions",
      title: "Promotions & Discounts",
      desc: "Receive exclusive discount codes and seasonal sale notices.",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="border-b border-neutral-100 pb-4">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-pink-500" />

          <h2 className="text-xl font-bold text-neutral-900">
            Notification Preferences
          </h2>
        </div>

        <p className="mt-1 text-xs text-neutral-500">
          Choose which BLIZKITS updates you want to receive.
        </p>
      </div>

      {email && (
        <div className="flex items-start gap-3 rounded-xl border border-pink-100 bg-pink-50/50 p-4">
          <Mail className="mt-0.5 h-4 w-4 shrink-0 text-pink-500" />

          <div>
            <p className="text-xs font-bold text-neutral-900">
              Email notifications
            </p>

            <p className="mt-0.5 break-all text-xs text-neutral-600">
              Order updates will be sent to{" "}
              <span className="font-semibold">
                {email}
              </span>
              .
            </p>
          </div>
        </div>
      )}

      {message && (
        <div
          className={`flex items-center gap-2 rounded-xl border p-3 text-xs font-semibold ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}

          {message.text}
        </div>
      )}

      <div className="space-y-4 pt-2">
        {options.map((item) => {
          const isChecked =
            settings[item.field];

          return (
            <div
              key={item.field}
              className="flex items-center justify-between gap-4 rounded-xl border border-neutral-200 bg-neutral-50/50 p-4"
            >
              <div>
                <p className="text-sm font-bold text-neutral-900">
                  {item.title}
                </p>

                <p className="mt-0.5 text-xs text-neutral-500">
                  {item.desc}
                </p>
              </div>

              <input
                type="checkbox"
                checked={isChecked}
                disabled={isPending}
                onChange={() =>
                  handleToggle(
                    item.field
                  )
                }
                className="h-4 w-4 shrink-0 cursor-pointer rounded accent-pink-500 disabled:cursor-not-allowed disabled:opacity-60"
                aria-label={item.title}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
