import React from "react";
import Svg, { Circle, Line, Path, Polygon, Polyline, Rect } from "react-native-svg";

type IconName =
  | "alert-circle" | "alert-triangle" | "arrow-down" | "arrow-left"
  | "arrow-right" | "bar-chart-2" | "briefcase" | "camera" | "check"
  | "check-circle" | "chevron-down" | "chevron-left" | "chevron-right" | "chevron-up" | "circle" | "clock"
  | "compass" | "cpu" | "credit-card" | "edit-2" | "flag" | "gift" | "globe"
  | "heart" | "info" | "instagram" | "lock" | "log-out" | "map-pin"
  | "message-circle" | "more-vertical" | "phone" | "refresh-cw" | "send" | "settings" | "shield"
  | "slash" | "sliders" | "star" | "unlock" | "upload" | "user" | "user-check"
  | "x" | "x-circle" | "zap";

interface FIconProps {
  name: IconName;
  size?: number;
  color?: string;
  style?: object;
}

const STROKE_PROPS = {
  fill: "none",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  strokeWidth: 2,
};

function Icon({ name, size = 24, color = "#000", style }: FIconProps) {
  const s = { ...STROKE_PROPS, stroke: color };

  const icons: Record<IconName, React.ReactNode> = {
    "alert-circle": (
      <>
        <Circle cx="12" cy="12" r="10" {...s} />
        <Line x1="12" y1="8" x2="12" y2="12" {...s} />
        <Line x1="12" y1="16" x2="12.01" y2="16" {...s} />
      </>
    ),
    "alert-triangle": (
      <>
        <Path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" {...s} />
        <Line x1="12" y1="9" x2="12" y2="13" {...s} />
        <Line x1="12" y1="17" x2="12.01" y2="17" {...s} />
      </>
    ),
    "arrow-down": (
      <>
        <Line x1="12" y1="5" x2="12" y2="19" {...s} />
        <Polyline points="19 12 12 19 5 12" {...s} />
      </>
    ),
    "arrow-left": (
      <>
        <Line x1="19" y1="12" x2="5" y2="12" {...s} />
        <Polyline points="12 19 5 12 12 5" {...s} />
      </>
    ),
    "arrow-right": (
      <>
        <Line x1="5" y1="12" x2="19" y2="12" {...s} />
        <Polyline points="12 5 19 12 12 19" {...s} />
      </>
    ),
    "bar-chart-2": (
      <>
        <Line x1="18" y1="20" x2="18" y2="10" {...s} />
        <Line x1="12" y1="20" x2="12" y2="4" {...s} />
        <Line x1="6" y1="20" x2="6" y2="14" {...s} />
      </>
    ),
    "briefcase": (
      <>
        <Rect x="2" y="7" width="20" height="14" rx="2" ry="2" {...s} />
        <Path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" {...s} />
      </>
    ),
    "camera": (
      <>
        <Path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" {...s} />
        <Circle cx="12" cy="13" r="4" {...s} />
      </>
    ),
    "check": <Polyline points="20 6 9 17 4 12" {...s} />,
    "check-circle": (
      <>
        <Path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" {...s} />
        <Polyline points="22 4 12 14.01 9 11.01" {...s} />
      </>
    ),
    "chevron-down": <Polyline points="6 9 12 15 18 9" {...s} />,
    "chevron-left": <Polyline points="15 18 9 12 15 6" {...s} />,
    "chevron-right": <Polyline points="9 18 15 12 9 6" {...s} />,
    "chevron-up": <Polyline points="18 15 12 9 6 15" {...s} />,
    "circle": <Circle cx="12" cy="12" r="10" {...s} />,
    "clock": (
      <>
        <Circle cx="12" cy="12" r="10" {...s} />
        <Polyline points="12 6 12 12 16 14" {...s} />
      </>
    ),
    "compass": (
      <>
        <Circle cx="12" cy="12" r="10" {...s} />
        <Polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" {...s} />
      </>
    ),
    "cpu": (
      <>
        <Rect x="4" y="4" width="16" height="16" rx="2" ry="2" {...s} />
        <Rect x="9" y="9" width="6" height="6" {...s} />
        <Line x1="9" y1="1" x2="9" y2="4" {...s} />
        <Line x1="15" y1="1" x2="15" y2="4" {...s} />
        <Line x1="9" y1="20" x2="9" y2="23" {...s} />
        <Line x1="15" y1="20" x2="15" y2="23" {...s} />
        <Line x1="20" y1="9" x2="23" y2="9" {...s} />
        <Line x1="20" y1="14" x2="23" y2="14" {...s} />
        <Line x1="1" y1="9" x2="4" y2="9" {...s} />
        <Line x1="1" y1="14" x2="4" y2="14" {...s} />
      </>
    ),
    "credit-card": (
      <>
        <Rect x="1" y="4" width="22" height="16" rx="2" ry="2" {...s} />
        <Line x1="1" y1="10" x2="23" y2="10" {...s} />
      </>
    ),
    "edit-2": <Path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" {...s} />,
    "flag": (
      <>
        <Path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" {...s} />
        <Line x1="4" y1="22" x2="4" y2="15" {...s} />
      </>
    ),
    "gift": (
      <>
        <Polyline points="20 12 20 22 4 22 4 12" {...s} />
        <Rect x="2" y="7" width="20" height="5" {...s} />
        <Line x1="12" y1="22" x2="12" y2="7" {...s} />
        <Path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" {...s} />
        <Path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" {...s} />
      </>
    ),
    "globe": (
      <>
        <Circle cx="12" cy="12" r="10" {...s} />
        <Line x1="2" y1="12" x2="22" y2="12" {...s} />
        <Path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" {...s} />
      </>
    ),
    "heart": <Path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" {...s} />,
    "info": (
      <>
        <Circle cx="12" cy="12" r="10" {...s} />
        <Line x1="12" y1="16" x2="12" y2="12" {...s} />
        <Line x1="12" y1="8" x2="12.01" y2="8" {...s} />
      </>
    ),
    "instagram": (
      <>
        <Rect x="2" y="2" width="20" height="20" rx="5" ry="5" {...s} />
        <Path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" {...s} />
        <Line x1="17.5" y1="6.5" x2="17.51" y2="6.5" {...s} />
      </>
    ),
    "lock": (
      <>
        <Rect x="3" y="11" width="18" height="11" rx="2" ry="2" {...s} />
        <Path d="M7 11V7a5 5 0 0 1 10 0v4" {...s} />
      </>
    ),
    "log-out": (
      <>
        <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" {...s} />
        <Polyline points="16 17 21 12 16 7" {...s} />
        <Line x1="21" y1="12" x2="9" y2="12" {...s} />
      </>
    ),
    "map-pin": (
      <>
        <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" {...s} />
        <Circle cx="12" cy="10" r="3" {...s} />
      </>
    ),
    "message-circle": <Path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" {...s} />,
    "more-vertical": (
      <>
        <Circle cx="12" cy="5" r="1" fill={color} stroke={color} strokeWidth={1} />
        <Circle cx="12" cy="12" r="1" fill={color} stroke={color} strokeWidth={1} />
        <Circle cx="12" cy="19" r="1" fill={color} stroke={color} strokeWidth={1} />
      </>
    ),
    "phone": <Path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.61 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.58 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" {...s} />,
    "refresh-cw": (
      <>
        <Polyline points="23 4 23 10 17 10" {...s} />
        <Polyline points="1 20 1 14 7 14" {...s} />
        <Path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" {...s} />
      </>
    ),
    "send": (
      <>
        <Line x1="22" y1="2" x2="11" y2="13" {...s} />
        <Polygon points="22 2 15 22 11 13 2 9 22 2" {...s} />
      </>
    ),
    "settings": (
      <>
        <Circle cx="12" cy="12" r="3" {...s} />
        <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 8.92 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" {...s} />
      </>
    ),
    "shield": <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" {...s} />,
    "slash": (
      <>
        <Circle cx="12" cy="12" r="10" {...s} />
        <Line x1="4.93" y1="4.93" x2="19.07" y2="19.07" {...s} />
      </>
    ),
    "sliders": (
      <>
        <Line x1="4" y1="21" x2="4" y2="14" {...s} />
        <Line x1="4" y1="10" x2="4" y2="3" {...s} />
        <Line x1="12" y1="21" x2="12" y2="12" {...s} />
        <Line x1="12" y1="8" x2="12" y2="3" {...s} />
        <Line x1="20" y1="21" x2="20" y2="16" {...s} />
        <Line x1="20" y1="12" x2="20" y2="3" {...s} />
        <Line x1="1" y1="14" x2="7" y2="14" {...s} />
        <Line x1="9" y1="8" x2="15" y2="8" {...s} />
        <Line x1="17" y1="16" x2="23" y2="16" {...s} />
      </>
    ),
    "star": <Polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" {...s} />,
    "unlock": (
      <>
        <Rect x="3" y="11" width="18" height="11" rx="2" ry="2" {...s} />
        <Path d="M7 11V7a5 5 0 0 1 9.9-1" {...s} />
      </>
    ),
    "upload": (
      <>
        <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" {...s} />
        <Polyline points="17 8 12 3 7 8" {...s} />
        <Line x1="12" y1="3" x2="12" y2="15" {...s} />
      </>
    ),
    "user": (
      <>
        <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" {...s} />
        <Circle cx="12" cy="7" r="4" {...s} />
      </>
    ),
    "user-check": (
      <>
        <Path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" {...s} />
        <Circle cx="8.5" cy="7" r="4" {...s} />
        <Polyline points="17 11 19 13 23 9" {...s} />
      </>
    ),
    "x": (
      <>
        <Line x1="18" y1="6" x2="6" y2="18" {...s} />
        <Line x1="6" y1="6" x2="18" y2="18" {...s} />
      </>
    ),
    "x-circle": (
      <>
        <Circle cx="12" cy="12" r="10" {...s} />
        <Line x1="15" y1="9" x2="9" y2="15" {...s} />
        <Line x1="9" y1="9" x2="15" y2="15" {...s} />
      </>
    ),
    "zap": <Polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" {...s} />,
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={style as any}>
      {icons[name]}
    </Svg>
  );
}

export default Icon;
