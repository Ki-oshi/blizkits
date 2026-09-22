import Link from "next/link";
import Container from "@/components/ui/Container";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-neutral-100 bg-white pt-16 pb-8 mt-auto">
      <Container>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4 lg:gap-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <span className="text-xl font-bold tracking-widest text-neutral-900">
              BLIZKITS
            </span>
            <p className="mt-4 text-sm text-neutral-500 leading-relaxed">
              Modern accessories and authentic K-Pop collectibles. Bold, clean, and beautifully crafted.
            </p>
          </div>

          {/* Shop */}
          <div>
            <h3 className="font-semibold text-neutral-900">Shop</h3>
            <ul className="mt-4 space-y-3">
              <li><Link href="/shop?category=phone-charms" className="text-sm text-neutral-500 hover:text-pink-500">Phone Charms</Link></li>
              <li><Link href="/shop?category=keychains" className="text-sm text-neutral-500 hover:text-pink-500">Keychains</Link></li>
              <li><Link href="/shop?category=photocards" className="text-sm text-neutral-500 hover:text-pink-500">K-Pop Photocards</Link></li>
              <li><Link href="/shop" className="text-sm text-neutral-500 hover:text-pink-500">All Products</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-semibold text-neutral-900">Support</h3>
            <ul className="mt-4 space-y-3">
              <li><Link href="/faq" className="text-sm text-neutral-500 hover:text-pink-500">FAQ</Link></li>
              <li><Link href="/contact" className="text-sm text-neutral-500 hover:text-pink-500">Contact Us</Link></li>
              <li><Link href="/account/orders" className="text-sm text-neutral-500 hover:text-pink-500">Track Order</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold text-neutral-900">Policies</h3>
            <ul className="mt-4 space-y-3">
              <li><Link href="/policies/shipping" className="text-sm text-neutral-500 hover:text-pink-500">Shipping Policy</Link></li>
              <li><Link href="/policies/returns" className="text-sm text-neutral-500 hover:text-pink-500">Returns & Refunds</Link></li>
              <li><Link href="/policies/privacy" className="text-sm text-neutral-500 hover:text-pink-500">Privacy Policy</Link></li>
              <li><Link href="/policies/terms" className="text-sm text-neutral-500 hover:text-pink-500">Terms of Service</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-16 flex flex-col items-center justify-between border-t border-neutral-100 pt-8 sm:flex-row">
          <p className="text-xs text-neutral-400">
            &copy; {currentYear} BLIZKITS. All rights reserved.
          </p>
          <div className="mt-4 flex space-x-4 sm:mt-0">
            {/* Social Links Placeholders */}
            <a href="#" className="text-neutral-400 hover:text-neutral-900">TikTok</a>
            <a href="#" className="text-neutral-400 hover:text-neutral-900">Instagram</a>
            <a href="#" className="text-neutral-400 hover:text-neutral-900">Facebook</a>
          </div>
        </div>
      </Container>
    </footer>
  );
}