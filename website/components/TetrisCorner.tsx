interface TetrisCornerProps {
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  pointing?: "outward" | "inward";
  variant?: "aligned" | "catty-corner";
  className?: string;
}

export function TetrisCorner({
  position,
  pointing = "outward",
  variant = "aligned",
  className = "",
}: TetrisCornerProps) {
  // Position with slight offset for catty-corner variant
  const positionClasses = variant === "catty-corner" ? {
    "top-left": "top-2 left-2",
    "top-right": "top-2 right-2",
    "bottom-left": "bottom-2 left-2",
    "bottom-right": "bottom-2 right-2",
  } : {
    "top-left": "top-0 left-0",
    "top-right": "top-0 right-0",
    "bottom-left": "bottom-0 left-0",
    "bottom-right": "bottom-0 right-0",
  };

  const tetrisPath = "M0 0 L14 0 L14 14 L0 14 Z M14 14 L28 14 L28 28 L14 28 Z";

  const getTransform = () => {
    if (variant === "catty-corner") {
      // Rotate each 90deg clockwise from aligned position
      if (pointing === "outward") {
        switch (position) {
          case "top-left": return "rotate(90deg)";
          case "top-right": return "scaleX(-1) rotate(90deg)";
          case "bottom-left": return "scaleY(-1) rotate(90deg)";
          case "bottom-right": return "scale(-1) rotate(90deg)";
        }
      } else {
        switch (position) {
          case "top-left": return "rotate(270deg)";
          case "top-right": return "scaleX(-1) rotate(270deg)";
          case "bottom-left": return "scaleY(-1) rotate(270deg)";
          case "bottom-right": return "scale(-1) rotate(270deg)";
        }
      }
    } else {
      // Original aligned style
      if (pointing === "outward") {
        switch (position) {
          case "top-left": return "";
          case "top-right": return "scaleX(-1)";
          case "bottom-left": return "scaleY(-1)";
          case "bottom-right": return "scale(-1)";
        }
      } else {
        switch (position) {
          case "top-left": return "rotate(180deg)";
          case "top-right": return "scaleX(-1) rotate(180deg)";
          case "bottom-left": return "scaleY(-1) rotate(180deg)";
          case "bottom-right": return "scale(-1) rotate(180deg)";
        }
      }
    }
  };

  return (
    <div className={`absolute w-7 h-7 ${positionClasses[position]} ${className}`}>
      <svg
        width="28"
        height="28"
        viewBox="0 0 28 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
        style={{ transform: getTransform() }}
        aria-hidden="true"
      >
        <path d={tetrisPath} fill="var(--logo-fill)" />
      </svg>
    </div>
  );
}
