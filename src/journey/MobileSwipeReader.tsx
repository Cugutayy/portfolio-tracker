import { useEffect, useRef } from "react";
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
  const trackRef = useRef<HTMLDivElement>(null);
  const committingRef = useRef(false);
  const fallbackTimerRef = useRef<number | null>(null);

  const centerTrack = () => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollLeft = track.clientWidth;
  };

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    committingRef.current = false;

    // Wait until layout has its final width, then position the current image
    // in the middle of [previous, current, next].
    requestAnimationFrame(() => {
      centerTrack();
      requestAnimationFrame(centerTrack);
    });

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => centerTrack())
        : null;
    resizeObserver?.observe(track);

    return () => {
      resizeObserver?.disconnect();
      if (fallbackTimerRef.current !== null) {
        clearTimeout(fallbackTimerRef.current);
      }
    };
  }, [photo.id]);

  const settleNativeScroll = () => {
    const track = trackRef.current;
    if (!track || committingRef.current) return;

    const width = Math.max(1, track.clientWidth);
    const position = track.scrollLeft / width;

    // Native momentum has already finished here. We only decide which of the
    // three pages the user actually flung towards.
    if (position > 1.17) {
      committingRef.current = true;
      onStep(1);
      return;
    }

    if (position < 0.83) {
      committingRef.current = true;
      onStep(-1);
      return;
    }

    // Not enough travel: settle back to the current photo. This is only a
    // short correction after native momentum, not a simulated drag.
    track.scrollTo({
      left: width,
      behavior:
        matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
    });
  };

  const handleScroll = () => {
    const track = trackRef.current as
      | (HTMLDivElement & { onscrollend?: ((event: Event) => void) | null })
      | null;
    if (!track || "onscrollend" in track) return;

    // Fallback for older WebKit/Chromium. iOS 26.2+ uses native scrollend.
    if (fallbackTimerRef.current !== null) {
      clearTimeout(fallbackTimerRef.current);
    }
    fallbackTimerRef.current = window.setTimeout(settleNativeScroll, 120);
  };

  return (
    <section
      className="jn-reader-stage-v15 jn-native-swipe-stage"
      style={{
        aspectRatio: `${Math.max(1, photo.width)} / ${Math.max(1, photo.height)}`,
      }}
    >
      <div
        className="jn-native-swipe-track"
        ref={trackRef}
        onScroll={handleScroll}
        onScrollEnd={settleNativeScroll}
        aria-label="Fotoğraflar arasında kaydır"
      >
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

      <button
        className="jn-reader-nav is-prev"
        onClick={() => {
          if (committingRef.current) return;
          committingRef.current = true;
          onStep(-1);
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
          onStep(1);
        }}
        aria-label="Sonraki fotoğraf"
      >
        <ChevronRight size={21} strokeWidth={1.25} />
      </button>
    </section>
  );
}
