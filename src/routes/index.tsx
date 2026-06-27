import { createFileRoute } from "@tanstack/react-router";
import { PhotoBooth } from "@/components/photobooth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SnapFrame — Korean-style Photobooth Studio" },
      {
        name: "description",
        content:
          "Capture, customize and share aesthetic photostrips in your browser. Solo, couple, friends and group modes with vintage filters, glossy frames and instant export.",
      },
      { property: "og:title", content: "SnapFrame — Korean-style Photobooth Studio" },
      {
        property: "og:description",
        content: "Capture, customize and share aesthetic photostrips in your browser.",
      },
    ],
  }),
  component: PhotoBooth,
});
