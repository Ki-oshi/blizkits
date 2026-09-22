export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  categoryId: string;
  images: string[];
  stock: number;
  featured?: boolean;
  isNew?: boolean;
}