import { useEffect, useLayoutEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Photo } from "./data";

type Props = {
  photo: Photo;
  previous: Photo;
  next: Photo;
  onStep: (step: -1 | 1) => void;
};

function SlideImage({
  photo,
  current = false,
}: {
  photo: Photo;
  current?: boolean;
}) {
  return (
    <img
      src={photo.src}
      srcSet={
        photo.thumbnail && photo.thumbnail !== photo.src
          ? `${photo.thumbnail} ${photo.smallWidth || 960}w, ${photo.src} ${photo.largeWidth || Math.min(photo.width, 3200)}w`
          : undefined
      }
      sizes="100vw"
      alt={current ? photo.title || photo.place || "Seyahat fotoğrafı" : ""}
      width={photo.width}
      height={photo.height}
      loading="eager"
      decoding="async"
      fetchPriority={current ? "high" : "low"}
      draggable={false}
    />
  );
}

export default function MobileSwipeReader({
  photo,
  previous,
  next,
  onStep,
}: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const onStepRef = useRef(onStep);
  const committingRef = useRef(false);
  const touchingRef = useRef(false);
  const suppressSettleRef = useRef(false);
  const fallbackTimerRef = useRef<number | null>(null);

  useEffect(() => {
    onStepRef.current = onStep;
  }, [onStep]);

  const centerViewport = () => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    viewport.scrollLeft = viewport.clientWidth;
  };

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    committingRef.current = false;
    suppressSettleRef.current = true;
    viewport.scrollLeft = viewport.clientWidth;

    const release = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        suppressSettleRef.current = false;
      });
    });

    return () => cancelAnimationFrame(release);
  }, [photo.id]);

  const settle = () => {
    const viewport = viewportRef.current;
    if (
      !viewport ||
      committingRef.current ||
      touchingRef.current ||
      suppressSettleRef.current
    ) {
      return;
    }

    const width = Math.max(1, viewport.clientWidth);
    const position = viewport.scrollLeft / width;

    // The viewport starts at exactly 1.00 (the middle slide). A modest native
    // pan is enough to commit; Safari itself provides the momentum.
    if (position >= 1.12) {
      committingRef.current = true;
      onStepRef.current(1);
      return;
    }

    if (position <= 0.88) {
      committingRef.current = true;
      onStepRef.current(-1);
      return;
    }

    // A tiny exploratory drag returns to center.
    suppressSettleRef.current = true;
    viewport.scrollTo({
      left: width,
      behavior:
        matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
    });
    window.setTimeout(() => {
      suppressSettleRef.current = false;
    }, 240);
  };

  const supportsNativeScrollEnd = () => {
    const viewport = viewportRef.current as
      | (HTMLDivElement & { onscrollend?: ((event: Event) => void) | null })
      | null;
    return Boolean(viewport && "onscrollend" in viewport);
  };

  const scheduleFallbackSettle = () => {
    if (supportsNativeScrollEnd()) return;
    if (fallbackTimerRef.current !== null) {
      clearTimeout(fallbackTimerRef.current);
    }
    fallbackTimerRef.current = window.setTimeout(settle, 160);
  };

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const handleScrollEnd = () => settle();
    const handleResize = () => {
      if (touchingRef.current || committingRef.current) return;
      suppressSettleRef.current = true;
      centerViewport();
      requestAnimationFrame(() => {
        suppressSettleRef.current = false;
      });
    };

    viewport.addEventListener("scrollend", handleScrollEnd);
    window.addEventListener("resize", handleResize);

    return () => {
      viewport.removeEventListener("scrollend", handleScrollEnd);
      window.removeEventListener("resize", handleResize);
      if (fallbackTimerRef.current !== null) {
        clearTimeout(fallbackTimerRef.current);
      }
    };
  }, []);

  return (
    <section className="jn-reader-stage-v15 jn-native-swipe-stage">
      <div
        className="jn-native-swipe-viewport"
        ref={viewportRef}
        onTouchStart={() => {
          touchingRef.current = true;
          if (fallbackTimerRef.current !== null) {
            clearTimeout(fallbackTimerRef.current);
            fallbackTimerRef.current = null;
          }
        }}
        onTouchEnd={() => {
          touchingRef.current = false;
          // iOS keeps decelerating after touchend. scrollend handles modern
          // Safari; this debounce is only a fallback if scrollend is absent.
          scheduleFallbackSettle();
        }}
        onTouchCancel={() => {
          touchingRef.current = false;
          scheduleFallbackSettle();
        }}
        onScroll={() => {
          if (
            !supportsNativeScrollEnd() &&
            !touchingRef.current &&
            !suppressSettleRef.current
          ) {
            scheduleFallbackSettle();
          }
        }}
        aria-label="Fotoğraflar arasında kaydır"
      >
        <div className="jn-native-swipe-strip">
          <figure className="jn-native-swipe-slide" aria-hidden="true">
            <SlideImage photo={previous} />
          </figure>
          <figure className="jn-native-swipe-slide is-current">
            <SlideImage photo={photo} current />
          </figure>
          <figure className="jn-native-swipe-slide" aria-hidden="true">
            <SlideImage photo={next} />
          </figure>
        </div>
      </div>

      <button
        className="jn-reader-nav is-prev"
        onClick={() => {
          if (committingRef.current) return;
          committingRef.current = true;
          onStepRef.current(-1);
        }}
        aria-label="Önceki fotoğraf"
      >
        <ChevronLeft size={21} strokeWidth={1.25} />
      </button>

      <button
        className="jn-reader-nav is-next"
        onClick={() => {
          if (committingRef.current) return;
          committingRef.current = true;
          onStepRef.current(1);
        }}
        aria-label="Sonraki fotoğraf"
      >
        <ChevronRight size={21} strokeWidth={1.25} />
      </button>
    </section>
  );
}
