import { useEffect, useRef } from "react";
import { animate } from "motion";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type PanInfo,
} from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Photo } from "./data";

type Props = {
  photo: Photo;
  previous: Photo;
  next: Photo;
  onStep: (step: -1 | 1) => void;
};

function PreviewImage({ photo }: { photo: Photo }) {
  return (
    <img
      src={photo.thumbnail || photo.src}
      alt=""
      width={photo.width}
      height={photo.height}
      loading="eager"
      decoding="async"
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
  const x = useMotionValue(0);
  const reducedMotion = useReducedMotion();
  const animationRef = useRef<ReturnType<typeof animate> | null>(null);
  const lockedRef = useRef(false);

  const rotate = useTransform(x, [-220, 0, 220], [-8.5, 0, 8.5]);
  const nextOpacity = useTransform(x, (value) =>
    Math.min(1, Math.max(0, -value / 105)),
  );
  const previousOpacity = useTransform(x, (value) =>
    Math.min(1, Math.max(0, value / 105)),
  );
  const nextScale = useTransform(
    x,
    (value) => 0.97 + Math.min(1, Math.max(0, -value / 125)) * 0.03,
  );
  const previousScale = useTransform(
    x,
    (value) => 0.97 + Math.min(1, Math.max(0, value / 125)) * 0.03,
  );

  useEffect(() => {
    x.set(0);
    lockedRef.current = false;
    animationRef.current?.stop();
    animationRef.current = null;
    return () => {
      animationRef.current?.stop();
    };
  }, [photo.id, x]);

  const settle = (info: PanInfo) => {
    if (lockedRef.current) return;

    const offset = info.offset.x;
    const velocity = info.velocity.x;
    // Motion reports velocity in px/s. Project ~180ms ahead so a short,
    // quick flick can commit even when the finger hasn't travelled far.
    const projected = offset + velocity * 0.18;
    const viewport = Math.max(320, window.innerWidth);
    const distanceThreshold = Math.min(76, viewport * 0.16);
    const velocityThreshold = 320;

    const commits =
      Math.abs(offset) >= distanceThreshold ||
      Math.abs(velocity) >= velocityThreshold ||
      Math.abs(projected) >= distanceThreshold * 1.08;

    if (!commits) {
      animationRef.current?.stop();
      animationRef.current = animate(x, 0, {
        type: "spring",
        stiffness: reducedMotion ? 900 : 520,
        damping: reducedMotion ? 80 : 38,
        mass: 0.72,
        velocity,
      });
      return;
    }

    const directionSignal =
      Math.abs(projected) > 18 ? projected : offset || velocity;
    const step: -1 | 1 = directionSignal < 0 ? 1 : -1;
    const target =
      (step === 1 ? -1 : 1) *
      (viewport + Math.max(180, viewport * 0.38));

    lockedRef.current = true;
    animationRef.current?.stop();

    if (reducedMotion) {
      x.set(target);
      onStep(step);
      return;
    }

    animationRef.current = animate(x, target, {
      type: "spring",
      stiffness: 285,
      damping: 29,
      mass: 0.78,
      velocity,
      restSpeed: 18,
      restDelta: 2,
      onComplete: () => onStep(step),
    });
  };

  const stepWithButton = (step: -1 | 1) => {
    if (lockedRef.current) return;
    lockedRef.current = true;
    animationRef.current?.stop();

    const target =
      (step === 1 ? -1 : 1) *
      (window.innerWidth + Math.max(160, window.innerWidth * 0.32));

    if (reducedMotion) {
      onStep(step);
      return;
    }

    animationRef.current = animate(x, target, {
      type: "spring",
      stiffness: 300,
      damping: 30,
      mass: 0.8,
      onComplete: () => onStep(step),
    });
  };

  return (
    <section className="jn-reader-stage-v15 jn-motion-swipe-stage">
      <motion.div
        className="jn-motion-swipe-underlay is-prev-preview"
        style={{ opacity: previousOpacity, scale: previousScale }}
        aria-hidden="true"
      >
        <PreviewImage photo={previous} />
      </motion.div>

      <motion.div
        className="jn-motion-swipe-underlay is-next-preview"
        style={{ opacity: nextOpacity, scale: nextScale }}
        aria-hidden="true"
      >
        <PreviewImage photo={next} />
      </motion.div>

      <motion.div
        className="jn-motion-swipe-card"
        drag="x"
        dragMomentum={false}
        dragElastic={1}
        dragConstraints={false}
        style={{
          x,
          rotate: reducedMotion ? 0 : rotate,
          touchAction: "pan-y",
        }}
        onDragEnd={(_, info) => settle(info)}
      >
        <img
          src={photo.src}
          srcSet={
            photo.thumbnail && photo.thumbnail !== photo.src
              ? `${photo.thumbnail} ${photo.smallWidth || 960}w, ${photo.src} ${photo.largeWidth || Math.min(photo.width, 3200)}w`
              : undefined
          }
          sizes="94vw"
          alt={photo.title || photo.place || "Seyahat fotoğrafı"}
          width={photo.width}
          height={photo.height}
          loading="eager"
          decoding="async"
          fetchPriority="high"
          draggable={false}
        />
      </motion.div>

      <button
        className="jn-reader-nav is-prev"
        onClick={() => stepWithButton(-1)}
        aria-label="Önceki fotoğraf"
      >
        <ChevronLeft size={21} strokeWidth={1.25} />
      </button>

      <button
        className="jn-reader-nav is-next"
        onClick={() => stepWithButton(1)}
        aria-label="Sonraki fotoğraf"
      >
        <ChevronRight size={21} strokeWidth={1.25} />
      </button>
    </section>
  );
}
