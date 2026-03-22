import { LottiePlayer } from "@/components/ui/lottie-player";

export default function RootLoading() {
  return (
    <div
      className="relative flex min-h-screen flex-col items-center justify-center gap-2 overflow-hidden"
      style={{ background: "#0d2d52" }}
    >
      {/* Animated gradient blobs */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div
          className="heysis-blob-a absolute -left-20 -top-20 h-[480px] w-[480px] rounded-full blur-[100px]"
          style={{ background: "rgba(77,160,232,0.55)" }}
        />
        <div
          className="heysis-blob-b absolute -bottom-24 -right-16 h-[420px] w-[420px] rounded-full blur-[110px]"
          style={{ background: "rgba(29,78,216,0.45)" }}
        />
        <div
          className="heysis-blob-c absolute left-1/2 top-1/2 h-[280px] w-[280px] rounded-full blur-[70px]"
          style={{ background: "rgba(125,211,252,0.30)" }}
        />
      </div>

      {/* Wordmark */}
      <p className="heysis-logo-in relative z-10 select-none text-2xl font-extrabold tracking-[0.18em] text-white/95">
        RIUM
      </p>

      {/* Lottie animation */}
      <LottiePlayer
        src="https://lottie.host/78284f30-bca5-491e-b297-50c7dc53a43e/HjVEbsxhER.lottie"
        className="relative z-10 h-72 w-72"
      />
    </div>
  );
}
