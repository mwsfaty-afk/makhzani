import { ImageResponse } from "next/og";

export const alt = "مخزني — نظام إدارة المخزون والمبيعات والمشتريات";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const tajawalBold = fetch("https://fonts.gstatic.com/s/tajawal/v12/Iurf6YBj_oCad4k1l5anLrY.ttf").then((r) =>
  r.arrayBuffer(),
);
const tajawalMedium = fetch("https://fonts.gstatic.com/s/tajawal/v12/Iurf6YBj_oCad4k1l8KiLrY.ttf").then((r) =>
  r.arrayBuffer(),
);

export default async function Image() {
  const [bold, medium] = await Promise.all([tajawalBold, tajawalMedium]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)",
        }}
      >
        <svg width="220" height="220" viewBox="0 0 100 100">
          <polygon points="50,20 78,35 50,50 22,35" fill="#FFFFFF" />
          <polygon points="22,35 50,50 50,80 22,65" fill="#FFFFFF" fillOpacity={0.75} />
          <polygon points="78,35 50,50 50,80 78,65" fill="#FFFFFF" fillOpacity={0.55} />
        </svg>
        <div style={{ display: "flex", flexDirection: "column", marginRight: 48, direction: "rtl" }}>
          <div style={{ fontFamily: "Tajawal", fontWeight: 800, fontSize: 110, color: "#FFFFFF" }}>مخزني</div>
          <div
            style={{
              fontFamily: "Tajawal",
              fontWeight: 500,
              fontSize: 38,
              color: "rgba(255,255,255,0.9)",
              marginTop: 8,
            }}
          >
            نظام إدارة المخزون والمبيعات والمشتريات
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Tajawal", data: bold, weight: 800, style: "normal" },
        { name: "Tajawal", data: medium, weight: 500, style: "normal" },
      ],
    },
  );
}
