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
        <span className="text-brand-navy text-lg font-bold tracking-tight">K-POINT</span>
      )}
    </div>
  );
}
