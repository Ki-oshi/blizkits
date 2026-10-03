import {
  Fragment,
} from "react";

import { createClient } from "@/lib/supabase/server";

import HomeHero from "@/components/home/HomeHero";
import TrustStrip from "@/components/home/TrustStrip";
import CategoryShowcase, {
  HomeCategory,
} from "@/components/home/CategoryShowcase";
import ProductSection from "@/components/home/ProductSection";
import LimitedDrop from "@/components/home/LimitedDrop";
import PromoBanner from "@/components/home/PromoBanner";

import { Product } from "@/types/product";

import {
  HomeCategoriesSettings,
  HomeFeaturedSettings,
  HomeHeroSettings,
  HomeJustLandedSettings,
  HomeLayoutSettings,
  HomeLimitedDropSettings,
  HomePromoSettings,
  HomeSectionKey,
} from "@/types/home";

/*
 * Force server rendering for every request so
 * homepage configuration and product changes
 * are reflected immediately.
 */
export const dynamic =
  "force-dynamic";

/* =========================================================
   DATABASE ROW TYPES
========================================================= */

interface SettingRow {
  key: string;
  value: unknown;
}

interface ProductRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number | string;
  category_id: string | null;
  images: string[] | null;
  stock: number | null;
  featured: boolean | null;
  is_new: boolean | null;
  created_at: string;
}

interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

/* =========================================================
   DEFAULT HOMEPAGE SETTINGS
========================================================= */

const defaultHero: HomeHeroSettings = {
  enabled: true,
  eyebrow:
    "K-Pop Merch & Custom Collectibles",
  title:
    "Elevate your bias with BLIZKITS.",
  description:
    "Discover exclusive K-pop photocards, handmade custom keychains, and collector merchandise made for fans.",
  primaryLabel:
    "Shop All Collections",
  primaryHref: "/shop",
  secondaryLabel:
    "Learn More",
  secondaryHref: "/about",
};

const defaultCategories: HomeCategoriesSettings =
  {
    enabled: true,
    title:
      "Explore Collections",
    subtitle:
      "Find photocards, keychains, charms, and collectibles made for your collection.",
    limit: 3,
  };

const defaultFeatured: HomeFeaturedSettings =
  {
    enabled: true,
    eyebrow: "Handpicked",
    title:
      "Featured Drops",
    subtitle:
      "Selected pieces and collector favorites from BLIZKITS.",
    limit: 4,
  };

const defaultLimited: HomeLimitedDropSettings =
  {
    enabled: false,
    eyebrow:
      "Limited Release",
    title: "Limited Drop",
    subtitle:
      "Available only while the clock is running.",
    startsAt: null,
    endsAt: null,
    productIds: [],
    limit: 4,
  };

const defaultJustLanded: HomeJustLandedSettings =
  {
    enabled: true,
    eyebrow:
      "Fresh Arrivals",
    title: "Just Landed",
    subtitle:
      "The newest additions to the BLIZKITS collection.",
    limit: 8,
    newBadgeDays: 14,
  };

const defaultPromo: HomePromoSettings =
  {
    enabled: false,
    eyebrow:
      "Special Offer",
    title:
      "A little something for your next haul.",
    description:
      "Watch this space for upcoming BLIZKITS offers and collector deals.",
    code: null,
    buttonLabel:
      "Shop Now",
    buttonHref:
      "/shop",
  };

const defaultLayout: HomeLayoutSettings =
  {
    sectionOrder: [
      "categories",
      "featured",
      "limited",
      "just_landed",
      "promo",
    ],
    showTrustStrip: true,
  };

/* =========================================================
   HELPERS
========================================================= */

function getSetting<T extends object>(
  settings: SettingRow[],
  key: string,
  fallback: T
): T {
  const row =
    settings.find(
      (item) =>
        item.key === key
    );

  if (
    !row ||
    !row.value ||
    typeof row.value !==
      "object" ||
    Array.isArray(row.value)
  ) {
    return fallback;
  }

  return {
    ...fallback,
    ...(row.value as Partial<T>),
  };
}

function safeLimit(
  value: unknown,
  fallback: number,
  maximum = 12
) {
  const parsed =
    Number(value);

  if (
    !Number.isFinite(
      parsed
    )
  ) {
    return fallback;
  }

  return Math.max(
    1,
    Math.min(
      maximum,
      Math.floor(parsed)
    )
  );
}

function safeDays(
  value: unknown,
  fallback: number
) {
  const parsed =
    Number(value);

  if (
    !Number.isFinite(
      parsed
    )
  ) {
    return fallback;
  }

  return Math.max(
    1,
    Math.min(
      90,
      Math.floor(parsed)
    )
  );
}

function isUuid(
  value: string
) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function mapProducts(
  rows:
    | ProductRow[]
    | null,
  options?: {
    newBadgeCutoffMs?: number;
  }
): Product[] {
  return (
    rows ?? []
  ).map((row) => {
    const createdAtMs =
      Date.parse(
        row.created_at
      );

    const automaticNew =
      options?.newBadgeCutoffMs !==
        undefined &&
      Number.isFinite(
        createdAtMs
      )
        ? createdAtMs >=
          options.newBadgeCutoffMs
        : Boolean(
            row.is_new
          );

    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description:
        row.description ??
        "",
      price: Number(
        row.price ?? 0
      ),
      categoryId:
        row.category_id ??
        "",
      images:
        Array.isArray(
          row.images
        )
          ? row.images
          : [],
      stock: Number(
        row.stock ?? 0
      ),
      featured: Boolean(
        row.featured
      ),
      isNew:
        automaticNew,
    };
  });
}

function normalizeSectionOrder(
  value:
    | HomeSectionKey[]
    | undefined
): HomeSectionKey[] {
  const validSections: HomeSectionKey[] =
    [
      "categories",
      "featured",
      "limited",
      "just_landed",
      "promo",
    ];

  if (
    !Array.isArray(value)
  ) {
    return validSections;
  }

  const normalized =
    value.filter(
      (
        section,
        index,
        array
      ) =>
        validSections.includes(
          section
        ) &&
        array.indexOf(
          section
        ) ===
          index
    );

  for (const section of validSections) {
    if (
      !normalized.includes(
        section
      )
    ) {
      normalized.push(
        section
      );
    }
  }

  return normalized;
}

/* =========================================================
   PAGE
========================================================= */

export default async function HomePage() {
  const supabase =
    await createClient();

  /*
   * Fetch configuration and categories first.
   */
  const [
    settingsResult,
    categoriesResult,
  ] =
    await Promise.all([
      supabase
        .from(
          "site_settings"
        )
        .select(
          "key, value"
        )
        .like(
          "key",
          "home_%"
        ),

      supabase
        .from(
          "categories"
        )
        .select(
          "id, name, slug, description"
        )
        .order("name", {
          ascending: true,
        }),
    ]);

  const settingsRows =
    (settingsResult.data ??
      []) as SettingRow[];

  /* =======================================================
     RESOLVE SETTINGS
  ======================================================= */

  const heroSettings =
    getSetting(
      settingsRows,
      "home_hero",
      defaultHero
    );

  const categoriesSettings =
    getSetting(
      settingsRows,
      "home_categories",
      defaultCategories
    );

  const featuredSettings =
    getSetting(
      settingsRows,
      "home_featured",
      defaultFeatured
    );

  const limitedSettings =
    getSetting(
      settingsRows,
      "home_limited_drop",
      defaultLimited
    );

  const justLandedSettings =
    getSetting(
      settingsRows,
      "home_just_landed",
      defaultJustLanded
    );

  const promoSettings =
    getSetting(
      settingsRows,
      "home_promo",
      defaultPromo
    );

  const layoutSettings =
    getSetting(
      settingsRows,
      "home_layout",
      defaultLayout
    );

  /* =======================================================
     SANITIZE SETTINGS
  ======================================================= */

  const categoryLimit =
    safeLimit(
      categoriesSettings.limit,
      3,
      6
    );

  const featuredLimit =
    safeLimit(
      featuredSettings.limit,
      4,
      12
    );

  const justLandedLimit =
    safeLimit(
      justLandedSettings.limit,
      8,
      12
    );

  const limitedLimit =
    safeLimit(
      limitedSettings.limit,
      4,
      12
    );

  const newBadgeDays =
    safeDays(
      justLandedSettings.newBadgeDays,
      14
    );

  const nowMs =
    Date.now();

  const newBadgeCutoffMs =
    nowMs -
    newBadgeDays *
      24 *
      60 *
      60 *
      1000;

  /* =======================================================
     LIMITED DROP STATE
  ======================================================= */

  const limitedStartMs =
    limitedSettings.startsAt
      ? Date.parse(
          limitedSettings.startsAt
        )
      : Number.NaN;

  const limitedEndMs =
    limitedSettings.endsAt
      ? Date.parse(
          limitedSettings.endsAt
        )
      : Number.NaN;

  const configuredLimitedIds =
    Array.isArray(
      limitedSettings.productIds
    )
      ? limitedSettings.productIds
          .filter(
            (
              value
            ): value is string =>
              typeof value ===
                "string" &&
              isUuid(value)
          )
          .slice(0, 50)
      : [];

  /*
   * Server-side time validation.
   *
   * Expired or future campaigns are not
   * rendered at all.
   */
  const isLimitedDropActive =
    limitedSettings.enabled &&
    Number.isFinite(
      limitedStartMs
    ) &&
    Number.isFinite(
      limitedEndMs
    ) &&
    limitedEndMs >
      limitedStartMs &&
    nowMs >=
      limitedStartMs &&
    nowMs <
      limitedEndMs &&
    configuredLimitedIds.length >
      0;

  /* =======================================================
     FETCH PRODUCT SECTIONS
  ======================================================= */

  const [
    featuredResult,
    justLandedResult,
  ] =
    await Promise.all([
      supabase
        .from(
          "products"
        )
        .select("*")
        .eq(
          "featured",
          true
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        )
        .limit(
          featuredLimit
        ),

      /*
       * Just Landed is now automatic.
       *
       * No is_new filter.
       * The newest uploaded products
       * are selected using created_at.
       */
      supabase
        .from(
          "products"
        )
        .select("*")
        .order(
          "created_at",
          {
            ascending: false,
          }
        )
        .limit(
          justLandedLimit
        ),
    ]);

  /* =======================================================
     FETCH LIMITED PRODUCTS
  ======================================================= */

  let limitedRows: ProductRow[] =
    [];

  if (
    isLimitedDropActive
  ) {
    const {
      data:
        limitedProductData,
    } =
      await supabase
        .from(
          "products"
        )
        .select("*")
        .in(
          "id",
          configuredLimitedIds
        );

    const unsortedRows =
      (limitedProductData ??
        []) as ProductRow[];

    /*
     * Supabase IN queries do not guarantee
     * the same ordering as productIds,
     * so restore the admin-configured order.
     */
    const productOrder =
      new Map<
        string,
        number
      >();

    configuredLimitedIds.forEach(
      (
        productId,
        index
      ) => {
        productOrder.set(
          productId,
          index
        );
      }
    );

    limitedRows =
      unsortedRows
        .sort(
          (a, b) =>
            (productOrder.get(
              a.id
            ) ??
              Number.MAX_SAFE_INTEGER) -
            (productOrder.get(
              b.id
            ) ??
              Number.MAX_SAFE_INTEGER)
        )
        .slice(
          0,
          limitedLimit
        );
  }

  /* =======================================================
     MAP DATA
  ======================================================= */

  const categories: HomeCategory[] =
    (
      (categoriesResult.data ??
        []) as CategoryRow[]
    )
      .slice(
        0,
        categoryLimit
      )
      .map(
        (category) => ({
          id: category.id,
          name:
            category.name,
          slug:
            category.slug,
          description:
            category.description,
        })
      );

  const featuredProducts =
    mapProducts(
      featuredResult.data as
        | ProductRow[]
        | null
    );

  const justLandedProducts =
    mapProducts(
      justLandedResult.data as
        | ProductRow[]
        | null,
      {
        newBadgeCutoffMs,
      }
    );

  const limitedProducts =
    mapProducts(
      limitedRows
    );

  const sectionOrder =
    normalizeSectionOrder(
      layoutSettings.sectionOrder
    );

  /* =======================================================
     SECTION RENDERING
  ======================================================= */

  function renderSection(
    section:
      HomeSectionKey
  ) {
    switch (section) {
      case "categories":
        return (
          <CategoryShowcase
            categories={
              categories
            }
            settings={{
              ...categoriesSettings,
              limit:
                categoryLimit,
            }}
          />
        );

      case "featured":
        return (
          <ProductSection
            products={
              featuredProducts
            }
            enabled={
              featuredSettings.enabled
            }
            eyebrow={
              featuredSettings.eyebrow
            }
            title={
              featuredSettings.title
            }
            subtitle={
              featuredSettings.subtitle
            }
            background="muted"
            emptyMessage="Check back soon for new featured drops."
          />
        );

      case "limited":
        if (
          !isLimitedDropActive ||
          !limitedSettings.endsAt ||
          limitedProducts.length ===
            0
        ) {
          return null;
        }

        return (
          <LimitedDrop
            products={
              limitedProducts
            }
            eyebrow={
              limitedSettings.eyebrow
            }
            title={
              limitedSettings.title
            }
            subtitle={
              limitedSettings.subtitle
            }
            endsAt={
              limitedSettings.endsAt
            }
            initialRemainingMs={
              Math.max(
                0,
                limitedEndMs -
                  nowMs
              )
            }
          />
        );

      case "just_landed":
        return (
          <ProductSection
            products={
              justLandedProducts
            }
            enabled={
              justLandedSettings.enabled
            }
            eyebrow={
              justLandedSettings.eyebrow
            }
            title={
              justLandedSettings.title
            }
            subtitle={
              justLandedSettings.subtitle
            }
            background="white"
            emptyMessage="No new items have landed yet."
          />
        );

      case "promo":
        return (
          <PromoBanner
            settings={
              promoSettings
            }
          />
        );

      default:
        return null;
    }
  }

  return (
    <main className="bg-white">
      {/* Dynamic Hero */}
      <HomeHero
        settings={
          heroSettings
        }
      />

      {/* Store Trust Strip */}
      {layoutSettings.showTrustStrip !==
        false && (
        <TrustStrip />
      )}

      {/* Dynamic Homepage Sections */}
      {sectionOrder.map(
        (section) => (
          <Fragment
            key={
              section
            }
          >
            {renderSection(
              section
            )}
          </Fragment>
        )
      )}
    </main>
  );
}