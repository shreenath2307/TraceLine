import React, { useRef, useEffect } from "react";
import { useAnimation } from "../context/AnimationContext";

export default function Background() {
  const videoRef = useRef(null);
  const glowRef = useRef(null);
  const { isPaused } = useAnimation();

  useEffect(() => {
    if (!videoRef.current) return;
    if (isPaused) {
      videoRef.current.pause();
    } else {
      const playPromise = videoRef.current.play();
      if (playPromise && playPromise.catch) {
        playPromise.catch(() => {});
      }
    }
  }, [isPaused]);

  // Subtle interactive ambient glow that follows mouse
  useEffect(() => {
    let frameId;
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 3;
    let currentX = targetX;
    let currentY = targetY;

    const handlePointerMove = (e) => {
      targetX = e.clientX;
      targetY = e.clientY;
    };

    const animateGlow = () => {
      // Smooth lerp
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;

      if (glowRef.current) {
        glowRef.current.style.transform = `translate3d(${currentX - 350}px, ${currentY - 350}px, 0)`;
      }
      frameId = requestAnimationFrame(animateGlow);
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    frameId = requestAnimationFrame(animateGlow);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <>
      <div className="bg-ambient" aria-hidden="true">
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_105406_16f4600d-7a92-4292-b96e-b19156c7830a.mp4"
        />
      </div>
      <div className="bg-glow-radial" aria-hidden="true" />
      <div
        ref={glowRef}
        aria-hidden="true"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "700px",
          height: "700px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255, 90, 71, 0.16) 0%, rgba(92, 165, 255, 0.10) 40%, transparent 70%)",
          filter: "blur(40px)",
          pointerEvents: "none",
          zIndex: -2,
          willChange: "transform"
        }}
      />
      <div className="bg-veil" aria-hidden="true" />
    </>
  );
}
