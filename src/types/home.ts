export type HomeSectionKey =
  | "categories"
  | "featured"
  | "limited"
  | "just_landed"
  | "promo";

export interface HomeHeroSettings {
  enabled: boolean;
  eyebrow: string;
  title: string;
  description: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
}

export interface HomeCategoriesSettings {
  enabled: boolean;
  title: string;
  subtitle: string;
  limit: number;
}

export interface HomeFeaturedSettings {
  enabled: boolean;
  eyebrow: string;
  title: string;
  subtitle: string;
  limit: number;
}

export interface HomeLimitedDropSettings {
  enabled: boolean;
  eyebrow: string;
  title: string;
  subtitle: string;
  startsAt: string | null;
  endsAt: string | null;
  productIds: string[];
  limit: number;
}

export interface HomeJustLandedSettings {
  enabled: boolean;
  eyebrow: string;
  title: string;
  subtitle: string;
  limit: number;
  newBadgeDays: number;
}

export interface HomePromoSettings {
  enabled: boolean;
  eyebrow: string;
  title: string;
  description: string;
  code: string | null;
  buttonLabel: string;
  buttonHref: string;
}

export interface HomeLayoutSettings {
  sectionOrder: HomeSectionKey[];
  showTrustStrip?: boolean;
}