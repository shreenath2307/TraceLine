import React, { useRef, useEffect } from "react";
import { useAnimation } from "../context/AnimationContext";

export default function Background() {
  const videoRef = useRef(null);
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
      <div className="bg-veil" aria-hidden="true" />
    </>
  );
}
