import Image from 'next/image';

interface LogoProps {
  size?: number;
  withWordmark?: boolean;
  tone?: 'light' | 'dark';
}

export function Logo({ size = 32, withWordmark = true, tone = 'light' }: LogoProps) {
  return (
    <div className="flex items-center gap-2">
      <Image src="/logo.png" alt="K-Platform" width={size} height={size} priority />
      {withWordmark && (
        <span
          className={`text-lg font-extrabold tracking-tight ${tone === 'light' ? 'text-slate-900' : 'text-white'}`}
        >
          K<span className="text-brand-gold">-PLATFORM</span>
        </span>
      )}
    </div>
  );
}
