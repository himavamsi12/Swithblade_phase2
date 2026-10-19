import localFont from "next/font/local";

// Only the weights used by the type scale: Regular (body), Medium and SemiBold (headings).
export const archivo = localFont({
  variable: "--font-archivo",
  display: "swap",
  src: [
    {
      path: "../assets/fonts/archivo/Archivo-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../assets/fonts/archivo/Archivo-Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../assets/fonts/archivo/Archivo-SemiBold.ttf",
      weight: "600",
      style: "normal",
    },
  ],
});
