"use client";

import {
  useEffect,
  useState,
} from "react";
import Image from "next/image";
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  X,
} from "lucide-react";

import { cn } from "@/utils/cn";

interface ProductGalleryProps {
  images: string[];
  productName: string;
  isNew?: boolean;
}

export default function ProductGallery({
  images,
  productName,
  isNew,
}: ProductGalleryProps) {
  const displayImages =
    Array.isArray(images) &&
    images.filter(Boolean).length >
      0
      ? images.filter(Boolean)
      : ["/placeholder.svg"];

  const [activeImage, setActiveImage] =
    useState(0);

  const [isZoomed, setIsZoomed] =
    useState(false);

  const hasMultipleImages =
    displayImages.length > 1;

  const showPrevious = () => {
    setActiveImage(
      (current) =>
        (current -
          1 +
          displayImages.length) %
        displayImages.length
    );
  };

  const showNext = () => {
    setActiveImage(
      (current) =>
        (current + 1) %
        displayImages.length
    );
  };

  useEffect(() => {
    if (!isZoomed) {
      return;
    }

    const handleKeyDown = (
      event: KeyboardEvent
    ) => {
      if (
        event.key === "Escape"
      ) {
        setIsZoomed(false);
      }

      if (
        event.key ===
          "ArrowLeft" &&
        hasMultipleImages
      ) {
        showPrevious();
      }

      if (
        event.key ===
          "ArrowRight" &&
        hasMultipleImages
      ) {
        showNext();
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    document.body.style.overflow =
      "hidden";

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );

      document.body.style.overflow =
        "";
    };
  }, [
    isZoomed,
    hasMultipleImages,
    displayImages.length,
  ]);

  return (
    <>
      <div className="flex flex-col gap-4 lg:flex-row lg:gap-5">
        {/* Thumbnails */}
        {hasMultipleImages && (
          <div className="order-2 flex w-full gap-3 overflow-x-auto pb-1 lg:order-1 lg:w-20 lg:flex-col lg:overflow-visible lg:pb-0 xl:w-24">
            {displayImages.map(
              (
                image,
                index
              ) => (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  onClick={() =>
                    setActiveImage(
                      index
                    )
                  }
                  aria-label={`View ${productName} image ${
                    index + 1
                  }`}
                  className={cn(
                    "relative aspect-square w-20 shrink-0 cursor-pointer overflow-hidden rounded-xl bg-neutral-100 transition-all xl:w-24",
                    activeImage ===
                      index
                      ? "ring-2 ring-pink-500 ring-offset-2"
                      : "opacity-60 ring-1 ring-neutral-200 hover:opacity-100"
                  )}
                >
                  <Image
                    src={
                      image
                    }
                    alt={`${productName} thumbnail ${
                      index +
                      1
                    }`}
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                </button>
              )
            )}
          </div>
        )}

        {/* Main Image */}
        <div className="group relative order-1 aspect-square min-w-0 flex-1 overflow-hidden rounded-3xl border border-neutral-100 bg-neutral-50 lg:order-2">
          {isNew && (
            <div className="absolute left-4 top-4 z-20 rounded-full bg-pink-500 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white shadow-sm">
              New
            </div>
          )}

          <Image
            src={
              displayImages[
                activeImage
              ]
            }
            alt={
              productName
            }
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 55vw"
            className="object-contain p-2 transition-transform duration-500 group-hover:scale-[1.02]"
          />

          {/* Image Counter */}
          {hasMultipleImages && (
            <div className="absolute bottom-4 left-4 z-20 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-neutral-700 shadow-sm backdrop-blur">
              {activeImage +
                1}{" "}
              /{" "}
              {
                displayImages.length
              }
            </div>
          )}

          {/* Previous */}
          {hasMultipleImages && (
            <button
              type="button"
              onClick={
                showPrevious
              }
              aria-label="Previous product image"
              className="absolute left-4 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/90 text-neutral-800 opacity-0 shadow-sm backdrop-blur transition-all hover:bg-white group-hover:opacity-100"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}

          {/* Next */}
          {hasMultipleImages && (
            <button
              type="button"
              onClick={
                showNext
              }
              aria-label="Next product image"
              className="absolute right-4 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/90 text-neutral-800 opacity-0 shadow-sm backdrop-blur transition-all hover:bg-white group-hover:opacity-100"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}

          {/* Zoom */}
          <button
            type="button"
            onClick={() =>
              setIsZoomed(
                true
              )
            }
            className="absolute bottom-4 right-4 z-20 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white/90 text-neutral-900 shadow-sm backdrop-blur transition-all hover:bg-white"
            aria-label="Open product image fullscreen"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Fullscreen Lightbox */}
      {isZoomed && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`${productName} image preview`}
          onClick={() =>
            setIsZoomed(
              false
            )
          }
        >
          {/* Close */}
          <button
            type="button"
            onClick={() =>
              setIsZoomed(
                false
              )
            }
            className="absolute right-5 top-5 z-[110] flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            aria-label="Close image preview"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Previous */}
          {hasMultipleImages && (
            <button
              type="button"
              onClick={(
                event
              ) => {
                event.stopPropagation();
                showPrevious();
              }}
              className="absolute left-4 top-1/2 z-[110] flex h-12 w-12 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:left-8"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}

          {/* Fullscreen Image */}
          <div
            className="relative h-[85vh] w-[85vw] max-w-6xl"
            onClick={(
              event
            ) =>
              event.stopPropagation()
            }
          >
            <Image
              src={
                displayImages[
                  activeImage
                ]
              }
              alt={`${productName} fullscreen`}
              fill
              sizes="90vw"
              className="object-contain"
            />
          </div>

          {/* Next */}
          {hasMultipleImages && (
            <button
              type="button"
              onClick={(
                event
              ) => {
                event.stopPropagation();
                showNext();
              }}
              className="absolute right-4 top-1/2 z-[110] flex h-12 w-12 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:right-8"
              aria-label="Next image"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}

          {/* Fullscreen Counter */}
          {hasMultipleImages && (
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-4 py-2 text-xs font-medium text-white backdrop-blur">
              {activeImage +
                1}{" "}
              /{" "}
              {
                displayImages.length
              }
            </div>
          )}
        </div>
      )}
    </>
  );
}