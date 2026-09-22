"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/utils/cn";
import { Maximize2, X } from "lucide-react";

interface ProductGalleryProps {
  images: string[];
  productName: string;
  isNew?: boolean;
}

export default function ProductGallery({ images, productName, isNew }: ProductGalleryProps) {
  const [activeImage, setActiveImage] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const displayImages = images.length > 0 ? images : ["/placeholder.jpg"];

  return (
    <>
      <div className="flex flex-col-reverse lg:flex-row lg:gap-x-6">
        {/* Thumbnails (Vertical on Desktop, Horizontal on Mobile/Tablet) */}
        {displayImages.length > 1 && (
          <div className="mt-4 flex w-full gap-3 overflow-x-auto lg:mt-0 lg:w-24 lg:flex-col lg:overflow-visible">
            {displayImages.map((image, idx) => (
              <button
                key={idx}
                onClick={() => setActiveImage(idx)}
                className={cn(
                  "relative flex aspect-square w-20 flex-shrink-0 cursor-pointer items-center justify-center rounded-xl bg-neutral-100 overflow-hidden transition-all lg:w-full",
                  activeImage === idx 
                    ? "ring-2 ring-pink-500 ring-offset-2 opacity-100" 
                    : "opacity-70 hover:opacity-100 ring-1 ring-transparent"
                )}
              >
                <Image 
                  src={image} 
                  alt={`${productName} thumbnail ${idx + 1}`} 
                  fill
                  sizes="96px"
                  className="object-cover" 
                />
              </button>
            ))}
          </div>
        )}

        {/* Main Image Display */}
        <div className="relative aspect-square w-full flex-1 overflow-hidden rounded-2xl bg-neutral-100 group">
          {isNew && (
            <div className="absolute left-4 top-4 z-10 rounded-full bg-pink-500 px-4 py-1.5 text-xs font-bold tracking-wider text-white shadow-sm">
              NEW
            </div>
          )}

          <Image
            src={displayImages[activeImage]}
            alt={productName}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />

          {/* Zoom Trigger Button */}
          <button
            onClick={() => setIsZoomed(true)}
            className="absolute bottom-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-neutral-900 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-white cursor-pointer"
            aria-label="Zoom image"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Fullscreen Image Modal / Lightbox */}
      {isZoomed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
          <button
            onClick={() => setIsZoomed(false)}
            className="absolute right-6 top-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="h-6 w-6" />
          </button>

          <div className="relative h-[85vh] w-[85vw] max-w-5xl">
            <Image
              src={displayImages[activeImage]}
              alt={`${productName} fullscreen`}
              fill
              className="object-contain"
            />
          </div>
        </div>
      )}
    </>
  );
}