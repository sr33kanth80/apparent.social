interface VerifiedAvatarProps {
  src?: string;
  name: string;
  /** Override the auto-computed initials when the name string won't produce sensible ones. */
  fallbackInitials?: string;
  size?: 'sm' | 'md' | 'lg' | 'feed';
  bg?: string;
  verified?: boolean;
}

const sizeMap = {
  sm: 'h-11 w-11 text-sm rounded-[14px]',
  md: 'h-12 w-12 text-sm rounded-2xl',
  /* Public-profile identity rail, where the avatar carries the header. */
  lg: 'h-20 w-20 text-xl rounded-[18px]',
  feed: 'h-10 w-10 text-xs rounded-xl',
};

const autoInitials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('') || name.slice(0, 2).toUpperCase();

export function VerifiedAvatar({
  src,
  name,
  fallbackInitials,
  size = 'md',
  bg = '#dcefc7',
  verified,
}: VerifiedAvatarProps) {
  const dim = sizeMap[size];
  const initials = fallbackInitials ?? autoInitials(name);

  return (
    <div className="relative shrink-0 inline-block">
      {src ? (
        <img src={src} alt={name} className={`${dim} object-cover`} />
      ) : (
        <div
          className={`${dim} flex items-center justify-center font-semibold`}
          style={{ background: bg }}
        >
          {initials}
        </div>
      )}
      {verified && (
        <span className="absolute -end-1 -top-1 pointer-events-none">
          <span className="sr-only">GitHub Verified</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              fill="white"
              d="M3.046 8.277A4.402 4.402 0 0 1 8.303 3.03a4.4 4.4 0 0 1 7.411 0 4.397 4.397 0 0 1 5.19 3.068c.207.713.23 1.466.067 2.19a4.4 4.4 0 0 1 0 7.415 4.403 4.403 0 0 1-3.06 5.187 4.398 4.398 0 0 1-2.186.072 4.398 4.398 0 0 1-7.422 0 4.398 4.398 0 0 1-5.257-5.248 4.4 4.4 0 0 1 0-7.437Z"
            />
            <path
              fill="#42520d"
              d="M4.674 8.954a3.602 3.602 0 0 1 4.301-4.293 3.6 3.6 0 0 1 6.064 0 3.598 3.598 0 0 1 4.3 4.302 3.6 3.6 0 0 1 0 6.067 3.6 3.6 0 0 1-4.29 4.302 3.6 3.6 0 0 1-6.074 0 3.598 3.598 0 0 1-4.3-4.293 3.6 3.6 0 0 1 0-6.085Z"
            />
            <path
              fill="white"
              d="M15.707 9.293a1 1 0 0 1 0 1.414l-4 4a1 1 0 0 1-1.414 0l-2-2a1 1 0 1 1 1.414-1.414L11 12.586l3.293-3.293a1 1 0 0 1 1.414 0Z"
            />
          </svg>
        </span>
      )}
    </div>
  );
}
