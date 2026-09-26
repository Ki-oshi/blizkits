"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
} from "react";

import { usePathname } from "next/navigation";
import { useRouter } from "nextjs-toploader/app";

import { createClient } from "@/lib/supabase/client";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image_url?: string;
  quantity: number;
  stock_level?: number;
}

interface CartContextType {
  cart: CartItem[];

  selectedIds: string[];

  toggleSelect: (id: string) => void;

  selectAll: (select: boolean) => void;

  addToCart: (
    product: any,
    quantity?: number
  ) => Promise<void>;

  removeFromCart: (id: string) => void;

  updateQuantity: (
    id: string,
    quantity: number
  ) => void;

  clearCart: () => void;

  subtotal: number;
  totalItems: number;

  selectedSubtotal: number;
  selectedItemsCount: number;

  isCartOpen: boolean;

  setIsCartOpen: (
    open: boolean
  ) => void;
}

const CartContext =
  createContext<CartContextType | undefined>(
    undefined
  );

export function CartProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [cart, setCart] = useState<
    CartItem[]
  >([]);

  const [
    selectedIds,
    setSelectedIds,
  ] = useState<string[]>([]);

  const [
    isCartOpen,
    setIsCartOpen,
  ] = useState(false);

  const [
    isInitialized,
    setIsInitialized,
  ] = useState(false);

  const router = useRouter();
  const pathname = usePathname();

  /*
   * Keep one Supabase browser
   * client instance.
   */
  const supabase = useMemo(
    () => createClient(),
    []
  );

  /*
   * Load cart from localStorage
   * when the provider mounts.
   */
  useEffect(() => {
    const savedCart =
      localStorage.getItem(
        "blizkits-cart"
      ) ||
      localStorage.getItem(
        "blizkits_cart"
      );

    if (savedCart) {
      try {
        const parsed =
          JSON.parse(savedCart);

        let itemsArray = parsed;

        /*
         * Compatibility with your
         * previous Zustand cart format.
         */
        if (
          parsed?.state?.items &&
          Array.isArray(
            parsed.state.items
          )
        ) {
          itemsArray =
            parsed.state.items.map(
              (item: any) => ({
                id:
                  item.product?.id ??
                  item.id,

                name:
                  item.product?.name ??
                  item.name,

                price:
                  item.product?.price ??
                  item.price,

                image_url:
                  item.product
                    ?.images?.[0] ??
                  item.product
                    ?.image_url ??
                  item.image_url,

                quantity:
                  item.quantity ?? 1,

                stock_level:
                  item.product?.stock ??
                  item.stock_level,
              })
            );
        }

        if (
          Array.isArray(itemsArray)
        ) {
          setCart(itemsArray);

          /*
           * Select all loaded items
           * by default.
           */
          setSelectedIds(
            itemsArray.map(
              (item: CartItem) =>
                item.id
            )
          );
        }
      } catch (error) {
        console.error(
          "Failed to parse cart storage:",
          error
        );
      }
    }

    setIsInitialized(true);
  }, []);

  /*
   * Save cart whenever it changes.
   */
  useEffect(() => {
    if (!isInitialized) return;

    localStorage.setItem(
      "blizkits-cart",
      JSON.stringify(cart)
    );
  }, [
    cart,
    isInitialized,
  ]);

  /*
   * Select / unselect one product.
   */
  const toggleSelect = (
    id: string
  ) => {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter(
            (itemId) =>
              itemId !== id
          )
        : [...prev, id]
    );
  };

  /*
   * Select or deselect every item.
   */
  const selectAll = (
    select: boolean
  ) => {
    if (select) {
      setSelectedIds(
        cart.map(
          (item) => item.id
        )
      );
    } else {
      setSelectedIds([]);
    }
  };

  /*
   * Add product to cart.
   *
   * IMPORTANT:
   * This DOES NOT open the cart drawer.
   */
  const addToCart = async (
    product: any,
    quantity = 1
  ) => {
    /*
     * Make sure the user is signed in.
     */
    const {
      data: { user },
      error,
    } =
      await supabase.auth.getUser();

    if (error || !user) {
      const redirectTo =
        pathname || "/shop";

      router.push(
        `/login?redirect=${encodeURIComponent(
          redirectTo
        )}&message=${encodeURIComponent(
          "Please sign in or create an account first before adding items to your cart."
        )}`
      );

      return;
    }

    /*
     * Add/update product.
     */
    setCart((prev) => {
      const existingItem =
        prev.find(
          (item) =>
            item.id === product.id
        );

      /*
       * Product already exists:
       * update quantity.
       */
      if (existingItem) {
        const maxStock =
          product.stock_level ??
          product.stock ??
          existingItem.stock_level ??
          999;

        return prev.map(
          (item) => {
            if (
              item.id !==
              product.id
            ) {
              return item;
            }

            return {
              ...item,

              quantity:
                Math.min(
                  item.quantity +
                    quantity,
                  maxStock
                ),
            };
          }
        );
      }

      /*
       * Product does not exist:
       * add new item.
       */
      const maxStock =
        product.stock_level ??
        product.stock;

      const safeQuantity =
        maxStock !== undefined
          ? Math.min(
              quantity,
              maxStock
            )
          : quantity;

      const newItem: CartItem = {
        id: product.id,

        name: product.name,

        price: product.price,

        image_url:
          product.image_url ??
          product.images?.[0] ??
          "/placeholder.svg",

        quantity: safeQuantity,

        stock_level:
          maxStock,
      };

      return [
        ...prev,
        newItem,
      ];
    });

    /*
     * Automatically mark the
     * newly-added item as selected.
     */
    setSelectedIds((prev) =>
      prev.includes(product.id)
        ? prev
        : [
            ...prev,
            product.id,
          ]
    );

    /*
     * DO NOT put:
     *
     * setIsCartOpen(true);
     *
     * here.
     *
     * Add to Cart should only
     * update the cart.
     */
  };

  /*
   * Remove item.
   */
  const removeFromCart = (
    id: string
  ) => {
    setCart((prev) =>
      prev.filter(
        (item) =>
          item.id !== id
      )
    );

    setSelectedIds((prev) =>
      prev.filter(
        (itemId) =>
          itemId !== id
      )
    );
  };

  /*
   * Change quantity.
   */
  const updateQuantity = (
    id: string,
    quantity: number
  ) => {
    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }

    setCart((prev) =>
      prev.map((item) => {
        if (item.id !== id) {
          return item;
        }

        const maxStock =
          item.stock_level ??
          999;

        return {
          ...item,

          quantity:
            Math.min(
              quantity,
              maxStock
            ),
        };
      })
    );
  };

  /*
   * Clear entire cart.
   */
  const clearCart = () => {
    setCart([]);
    setSelectedIds([]);

    localStorage.removeItem(
      "blizkits-cart"
    );

    localStorage.removeItem(
      "blizkits_cart"
    );
  };

  /*
   * Cart calculations.
   */
  const subtotal =
    cart.reduce(
      (sum, item) =>
        sum +
        item.price *
          item.quantity,
      0
    );

  const totalItems =
    cart.reduce(
      (sum, item) =>
        sum +
        item.quantity,
      0
    );

  const selectedItems =
    cart.filter((item) =>
      selectedIds.includes(
        item.id
      )
    );

  const selectedSubtotal =
    selectedItems.reduce(
      (sum, item) =>
        sum +
        item.price *
          item.quantity,
      0
    );

  const selectedItemsCount =
    selectedItems.reduce(
      (sum, item) =>
        sum +
        item.quantity,
      0
    );

  return (
    <CartContext.Provider
      value={{
        cart,

        selectedIds,

        toggleSelect,

        selectAll,

        addToCart,

        removeFromCart,

        updateQuantity,

        clearCart,

        subtotal,

        totalItems,

        selectedSubtotal,

        selectedItemsCount,

        isCartOpen,

        setIsCartOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context =
    useContext(CartContext);

  if (!context) {
    throw new Error(
      "useCart must be used within a CartProvider"
    );
  }

  return context;
}