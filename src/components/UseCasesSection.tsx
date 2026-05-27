import { ArrowRight } from 'lucide-react';

export const UseCasesSection = () => {
  return (
    <section className="bg-[#F5F5F5] px-6 py-24">
      <div className="max-w-[88rem] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* Left Column */}
          <div className="md:pr-12 md:pt-2">
            <p className="text-black/60 text-sm mb-2">Apparent in Practice</p>
            <h2
              className="text-5xl md:text-6xl font-medium leading-none mb-6"
              style={{ letterSpacing: '-0.04em' }}
            >
              Use modes
            </h2>
            <p className="text-black/60 text-base leading-relaxed max-w-sm">
              Apparent brings together builder profiles, VC thesis pages, launches, meetups, local maps, and deal workflows so capital can find real builders earlier.
            </p>
          </div>

          {/* Right Column: Large Card */}
          <div className="relative rounded-3xl overflow-hidden min-h-[720px]">
            {/* Background video with fallback */}
            <video
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
              poster="https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1920&q=80"
            >
              <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260423_183428_ab5e672a-f608-4dcb-b319-f3e040f02e2d.mp4" type="video/mp4" />
            </video>

            {/* Content Overlay */}
            <div className="relative z-10 p-10 md:p-12">
              <h3
                className="text-4xl md:text-5xl font-medium leading-tight mb-5"
                style={{ letterSpacing: '-0.03em' }}
              >
                For Founders
              </h3>
              <p className="text-black/70 text-base max-w-md mb-8">
                Build a proof-of-work profile, launch products, connect GitHub, add press, find nearby VC events, and get matched with investors whose thesis fits what you are building.
              </p>
              <a
                href="#"
                className="inline-flex items-center gap-3 group text-black font-medium hover:text-black/80 transition-colors duration-200"
              >
                <div className="w-9 h-9 rounded-full bg-white/80 backdrop-blur flex items-center justify-center group-hover:bg-white transition-colors">
                  <ArrowRight className="w-4 h-4 text-black" />
                </div>
                Know more
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
