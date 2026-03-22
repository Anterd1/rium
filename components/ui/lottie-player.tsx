"use client";

import { DotLottieReact } from "@lottiefiles/dotlottie-react";

interface LottiePlayerProps {
  src: string;
  className?: string;
}

export function LottiePlayer({ src, className }: LottiePlayerProps) {
  return (
    <DotLottieReact
      src={src}
      autoplay
      loop
      className={className}
    />
  );
}
