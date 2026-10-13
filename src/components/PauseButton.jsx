import React from "react";
import { useAnimation } from "../context/AnimationContext";
import { Play, Pause } from "lucide-react";

export default function PauseButton() {
  const { isPaused, togglePaused } = useAnimation();

  return (
    <button
      className="pause-fab"
      onClick={togglePaused}
      aria-pressed={isPaused}
      aria-label={isPaused ? "Play animation" : "Pause animation"}
      title={isPaused ? "Resume animations" : "Pause all animations"}
    >
      {isPaused ? <Play size={16} fill="currentColor" /> : <Pause size={16} fill="currentColor" />}
      <span>{isPaused ? "Play animation" : "Pause animation"}</span>
    </button>
  );
}
