"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Info, AlertTriangle, Gift, Megaphone } from "lucide-react";
import { StickyBanner } from "@/components/ui/sticky-banner";
import { getActiveBannerForUser, dismissBanner, BannerData } from "@/app/actions/banner.action";

const bannerStyles = {
  INFO: {
    bg: "bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500",
    icon: Info,
  },
  WARNING: {
    bg: "bg-gradient-to-r from-amber-600 via-orange-500 to-yellow-500",
    icon: AlertTriangle,
  },
  PROMO: {
    bg: "bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500",
    icon: Gift,
  },
  ANNOUNCEMENT: {
    bg: "bg-gradient-to-r from-purple-600 via-violet-500 to-indigo-500",
    icon: Megaphone,
  },
};

export function PromotionBanner() {
  const [banner, setBanner] = useState<BannerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function fetchBanner() {
      try {
        const result = await getActiveBannerForUser();
        setBanner(result);
      } catch (error) {
        console.error("Failed to fetch banner:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchBanner();
  }, []);

  const handleDismiss = async () => {
    if (banner) {
      setDismissed(true);
      await dismissBanner(banner.id);
    }
  };

  if (loading || !banner || dismissed) {
    return null;
  }

  const style = bannerStyles[banner.type] || bannerStyles.INFO;
  const IconComponent = style.icon;

  return (
    <StickyBanner className={style.bg} onDismiss={handleDismiss}>
      <div className="flex items-center gap-3 text-white">
        <IconComponent className="h-5 w-5 flex-shrink-0" />
        <p className="text-sm font-medium">{banner.message}</p>
        {banner.buttonText && banner.buttonUrl && (
          <button
            onClick={() => {
              const url = banner.buttonUrl!;
              // Check if external URL (starts with http, https, or www)
              const isExternal = /^(https?:\/\/|www\.)/i.test(url);
              if (isExternal) {
                // Add https:// if URL starts with www
                const fullUrl = url.startsWith('www.') ? `https://${url}` : url;
                window.open(fullUrl, '_blank', 'noopener,noreferrer');
              } else {
                router.push(url);
              }
            }}
            className="ml-2 rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-gray-800 transition-transform hover:scale-105"
          >
            {banner.buttonText}
          </button>
        )}
      </div>
    </StickyBanner>
  );
}
