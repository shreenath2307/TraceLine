import React, { createContext, useContext, useState, useEffect } from "react";

const AnimationContext = createContext({
  isPaused: false,
  togglePaused: () => {}
});

export function AnimationProvider({ children }) {
  const [isPaused, setIsPaused] = useState(() => {
    try {
      const stored = localStorage.getItem("tl-paused");
      if (stored !== null) return stored === "1";
      return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    document.documentElement.classList.toggle("paused", isPaused);
    try {
      localStorage.setItem("tl-paused", isPaused ? "1" : "0");
    } catch {
      // storage unavailable
    }
    window.TL = window.TL || {};
    window.TL.paused = isPaused;
    document.dispatchEvent(new CustomEvent("tl:pause", { detail: isPaused }));
  }, [isPaused]);

  const togglePaused = () => setIsPaused((prev) => !prev);

  return (
    <AnimationContext.Provider value={{ isPaused, togglePaused }}>
      {children}
    </AnimationContext.Provider>
  );
}

export const useAnimation = () => useContext(AnimationContext);
