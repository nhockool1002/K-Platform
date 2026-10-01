import Image from 'next/image';

interface LogoProps {
  size?: number;
  withWordmark?: boolean;
}

export function Logo({ size = 32, withWordmark = true }: LogoProps) {
  return (
    <div className="flex items-center gap-2">
      <Image src="/logo.png" alt="K-Point Platform" width={size} height={size} priority />
      {withWordmark && (
        <span className="font-display text-navy text-lg font-semibold tracking-tight">K-Point</span>
      )}
    </div>
  );
}
