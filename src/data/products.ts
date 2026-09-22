import { Product } from "@/types/product";

export const products: Product[] = [
  {
    id: "p-1",
    name: "Starlight Pink Phone Charm",
    slug: "starlight-pink-phone-charm",
    description: "Beaded phone charm featuring pink stars and pearl accents.",
    price: 199,
    categoryId: "c-1",
    images: ["/products/placeholder-charm.jpg"],
    stock: 15,
    featured: true,
    isNew: true,
  },
  {
    id: "p-2",
    name: "Midnight Black Bow Keychain",
    slug: "midnight-black-bow-keychain",
    description: "Sleek black ribbon and silver hardware.",
    price: 150,
    categoryId: "c-2",
    images: ["/products/placeholder-keychain.jpg"],
    stock: 8,
    featured: true,
  },
];