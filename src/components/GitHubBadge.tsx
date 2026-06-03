import { useEffect, useRef, useState, type MouseEvent } from "react";

interface GitHubBadgeProps {
  username: string;
  link?: string;
}

const identityMatrix =
  "1, 0, 0, 0, " +
  "0, 1, 0, 0, " +
  "0, 0, 1, 0, " +
  "0, 0, 0, 1";

const maxRotate = 0.25;
const minRotate = -0.25;
const maxScale = 1;
const minScale = 0.97;

export const GitHubBadge = ({ username, link }: GitHubBadgeProps) => {
  const ref = useRef<HTMLAnchorElement>(null);
  const [firstOverlayPosition, setFirstOverlayPosition] = useState<number>(0);
  const [matrix, setMatrix] = useState<string>(identityMatrix);
  const [currentMatrix, setCurrentMatrix] = useState<string>(identityMatrix);
  const [disableInOutOverlayAnimation, setDisableInOutOverlayAnimation] = useState<boolean>(true);
  const [disableOverlayAnimation, setDisableOverlayAnimation] = useState<boolean>(false);
  const [isTimeoutFinished, setIsTimeoutFinished] = useState<boolean>(false);
  const enterTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimeout1 = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimeout2 = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimeout3 = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getDimensions = () => {
    const left = ref.current?.getBoundingClientRect().left ?? 0;
    const right = ref.current?.getBoundingClientRect().right ?? 0;
    const top = ref.current?.getBoundingClientRect().top ?? 0;
    const bottom = ref.current?.getBoundingClientRect().bottom ?? 0;
    return { left, right, top, bottom };
  };

  const getMatrix = (clientX: number, clientY: number) => {
    const { left, right, top, bottom } = getDimensions();
    const xCenter = (left + right) / 2;
    const yCenter = (top + bottom) / 2;
    const scale = [
      maxScale - (maxScale - minScale) * Math.abs(xCenter - clientX) / (xCenter - left),
      maxScale - (maxScale - minScale) * Math.abs(yCenter - clientY) / (yCenter - top),
      maxScale - (maxScale - minScale) * (Math.abs(xCenter - clientX) + Math.abs(yCenter - clientY)) / (xCenter - left + yCenter - top),
    ];
    const rotate = {
      x1: 0.25 * ((yCenter - clientY) / yCenter - (xCenter - clientX) / xCenter),
      x2: maxRotate - (maxRotate - minRotate) * Math.abs(right - clientX) / (right - left),
      y2: maxRotate - (maxRotate - minRotate) * (top - clientY) / (top - bottom),
      z0: -(maxRotate - (maxRotate - minRotate) * Math.abs(right - clientX) / (right - left)),
      z1: 0.2 - (0.2 + 0.6) * (top - clientY) / (top - bottom),
    };
    return `${scale[0]}, 0, ${rotate.z0}, 0, ` +
      `${rotate.x1}, ${scale[1]}, ${rotate.z1}, 0, ` +
      `${rotate.x2}, ${rotate.y2}, ${scale[2]}, 0, ` +
      `0, 0, 0, 1`;
  };

  const getOppositeMatrix = (_matrix: string, clientY: number, onMouseEnter?: boolean) => {
    const { top, bottom } = getDimensions();
    const oppositeY = bottom - clientY + top;
    const weakening = onMouseEnter ? 0.7 : 4;
    const multiplier = onMouseEnter ? -1 : 1;
    return _matrix.split(", ").map((item, index) => {
      if (index === 2 || index === 4 || index === 8) return String(-parseFloat(item) * multiplier / weakening);
      if (index === 0 || index === 5 || index === 10) return "1";
      if (index === 6) return String(multiplier * (maxRotate - (maxRotate - minRotate) * (top - oppositeY) / (top - bottom)) / weakening);
      if (index === 9) return String((maxRotate - (maxRotate - minRotate) * (top - oppositeY) / (top - bottom)) / weakening);
      return item;
    }).join(", ");
  };

  const onMouseEnter = (e: MouseEvent<HTMLAnchorElement>) => {
    if (leaveTimeout1.current) clearTimeout(leaveTimeout1.current);
    if (leaveTimeout2.current) clearTimeout(leaveTimeout2.current);
    if (leaveTimeout3.current) clearTimeout(leaveTimeout3.current);
    setDisableOverlayAnimation(true);
    const { left, right, top, bottom } = getDimensions();
    const xCenter = (left + right) / 2;
    const yCenter = (top + bottom) / 2;
    setDisableInOutOverlayAnimation(false);
    enterTimeout.current = setTimeout(() => setDisableInOutOverlayAnimation(true), 350);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setFirstOverlayPosition((Math.abs(xCenter - e.clientX) + Math.abs(yCenter - e.clientY)) / 1.5);
      });
    });
    const m = getMatrix(e.clientX, e.clientY);
    setMatrix(getOppositeMatrix(m, e.clientY, true));
    setIsTimeoutFinished(false);
    setTimeout(() => setIsTimeoutFinished(true), 200);
  };

  const onMouseMove = (e: MouseEvent<HTMLAnchorElement>) => {
    const { left, right, top, bottom } = getDimensions();
    const xCenter = (left + right) / 2;
    const yCenter = (top + bottom) / 2;
    setTimeout(() => setFirstOverlayPosition((Math.abs(xCenter - e.clientX) + Math.abs(yCenter - e.clientY)) / 1.5), 150);
    if (isTimeoutFinished) setCurrentMatrix(getMatrix(e.clientX, e.clientY));
  };

  const onMouseLeave = (e: MouseEvent<HTMLAnchorElement>) => {
    const oppositeMatrix = getOppositeMatrix(matrix, e.clientY);
    if (enterTimeout.current) clearTimeout(enterTimeout.current);
    setCurrentMatrix(oppositeMatrix);
    setTimeout(() => setCurrentMatrix(identityMatrix), 200);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setDisableInOutOverlayAnimation(false);
        leaveTimeout1.current = setTimeout(() => setFirstOverlayPosition(-firstOverlayPosition / 4), 150);
        leaveTimeout2.current = setTimeout(() => setFirstOverlayPosition(0), 300);
        leaveTimeout3.current = setTimeout(() => {
          setDisableOverlayAnimation(false);
          setDisableInOutOverlayAnimation(true);
        }, 500);
      });
    });
  };

  useEffect(() => {
    if (isTimeoutFinished) setMatrix(currentMatrix);
  }, [currentMatrix, isTimeoutFinished]);

  const href = link ?? `https://github.com/${username}`;

  // GitHub-palette shimmer colors
  const overlayColors = [
    "hsl(136, 62%, 46%)",
    "hsl(212, 92%, 56%)",
    "hsl(265, 73%, 61%)",
    "hsl(30, 80%, 55%)",
    "hsl(180, 50%, 55%)",
    "hsl(136, 62%, 70%)",
    "hsl(0, 0%, 85%)",
    "white",
    "transparent",
    "transparent",
  ];

  const overlayAnimations = [...Array(10).keys()].map((i) =>
    `@keyframes ghOverlay${i + 1} {
      0% { transform: rotate(${i * 10}deg); }
      50% { transform: rotate(${(i + 1) * 10}deg); }
      100% { transform: rotate(${i * 10}deg); }
    }`
  ).join(" ");

  return (
    <a
      ref={ref}
      href={href}
      target="_blank"
      rel="noreferrer"
      className="block w-[210px] h-auto cursor-pointer shrink-0"
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      onMouseEnter={onMouseEnter}
    >
      <style>{overlayAnimations}</style>
      <div
        style={{
          transform: `perspective(700px) matrix3d(${matrix})`,
          transformOrigin: "center center",
          transition: "transform 200ms ease-out",
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 210 54" className="w-full h-auto">
          <defs>
            <filter id="ghBlur">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
            </filter>
            <mask id="ghMask">
              <rect width="210" height="54" fill="white" rx="10" />
            </mask>
            <clipPath id="ghTextClip">
              <rect x="44" y="0" width="136" height="54" />
            </clipPath>
          </defs>

          {/* Background */}
          <rect width="210" height="54" rx="10" fill="#24292f" />
          <rect x="3" y="3" width="204" height="48" rx="8" fill="transparent" stroke="#3d444d" strokeWidth="1" />

          {/* GitHub Octocat: 20×20 centered vertically */}
          <g transform="translate(14, 17) scale(0.833)">
            <path
              fill="white"
              d="M12 0C5.37 0 0 5.49 0 12.26c0 5.42 3.44 10.02 8.21 11.65.6.11.82-.27.82-.59v-2.28c-3.34.74-4.04-1.64-4.04-1.64-.55-1.42-1.33-1.8-1.33-1.8-1.09-.76.08-.74.08-.74 1.2.09 1.84 1.27 1.84 1.27 1.07 1.87 2.81 1.33 3.49 1.02.11-.8.42-1.33.76-1.64-2.67-.31-5.47-1.36-5.47-6.06 0-1.34.47-2.43 1.24-3.29-.12-.31-.54-1.56.12-3.24 0 0 1.01-.33 3.3 1.26.96-.27 1.98-.41 3-.41s2.05.14 3 .41c2.29-1.59 3.3-1.26 3.3-1.26.66 1.68.24 2.93.12 3.24.77.86 1.24 1.95 1.24 3.29 0 4.71-2.81 5.75-5.48 6.05.43.38.81 1.12.81 2.26v3.35c0 .33.22.71.82.59A12.24 12.24 0 0 0 24 12.26C24 5.49 18.63 0 12 0Z"
            />
          </g>

          {/* Label */}
          <text
            fontFamily="Helvetica-Bold, Helvetica"
            fontSize="7.5"
            fontWeight="bold"
            fill="#8b949e"
            x="44"
            y="22"
          >
            GITHUB VERIFIED
          </text>

          {/* Username */}
          <text
            fontFamily="Helvetica-Bold, Helvetica"
            fontSize="14"
            fontWeight="bold"
            fill="white"
            x="44"
            y="41"
            clipPath="url(#ghTextClip)"
          >
            @{username}
          </text>

          {/* Verified check circle */}
          <circle cx="196" cy="27" r="7" fill="#2dba4e" />
          <polyline
            points="193,27.5 195.5,30 200,24"
            fill="none"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Shimmer overlay */}
          <g style={{ mixBlendMode: "overlay" }} mask="url(#ghMask)">
            {overlayColors.map((color, i) => (
              <g
                key={i}
                style={{
                  transform: `rotate(${firstOverlayPosition + i * 10}deg)`,
                  transformOrigin: "center center",
                  transition: !disableInOutOverlayAnimation ? "transform 200ms ease-out" : "none",
                  animation: disableOverlayAnimation ? "none" : `ghOverlay${i + 1} 5s infinite`,
                  willChange: "transform",
                }}
              >
                <polygon
                  points="0,0 210,54 210,0 0,54"
                  fill={color}
                  filter="url(#ghBlur)"
                  opacity="0.3"
                />
              </g>
            ))}
          </g>
        </svg>
      </div>
    </a>
  );
};
