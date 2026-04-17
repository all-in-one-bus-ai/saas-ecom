'use client';

interface Props {
  storeName: string;
  description: string;
}

export function StorefrontHero({ storeName, description }: Props) {
  return (
    <section
      className="relative overflow-hidden"
      style={{ backgroundColor: 'var(--color-primary)' }}
    >
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `url("https://images.pexels.com/photos/5632398/pexels-photo-5632398.jpeg?auto=compress&cs=tinysrgb&w=1600")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
        <div className="max-w-2xl">
          <p
            className="text-sm font-semibold uppercase tracking-widest mb-4 opacity-70"
            style={{ color: 'var(--color-primary-foreground)' }}
          >
            Welcome to
          </p>
          <h1
            className="text-5xl md:text-6xl font-bold leading-tight mb-6"
            style={{
              fontFamily: 'var(--font-heading)',
              color: 'var(--color-primary-foreground)',
            }}
          >
            {storeName}
          </h1>
          {description && (
            <p
              className="text-lg md:text-xl leading-relaxed mb-10 opacity-80"
              style={{ color: 'var(--color-primary-foreground)' }}
            >
              {description}
            </p>
          )}
          <button
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-lg font-semibold text-sm transition-all duration-200 hover:opacity-90 hover:shadow-lg"
            style={{
              backgroundColor: 'var(--color-accent)',
              color: 'var(--color-accent-foreground)',
            }}
          >
            Shop Now
          </button>
        </div>
      </div>
    </section>
  );
}
