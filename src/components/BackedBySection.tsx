const backers = [
  { name: 'Fundamental Labs', style: { fontFamily: 'Times New Roman, serif', fontWeight: 400, letterSpacing: '0.02em', fontSize: '14px' } },
  { name: 'KUCOIN', style: { fontFamily: 'Arial Black, sans-serif', fontWeight: 900, letterSpacing: '0.08em', fontSize: '16px' } },
  { name: 'NGC', style: { fontFamily: 'Impact, sans-serif', fontWeight: 700, letterSpacing: '0.05em', fontSize: '18px' } },
  { name: 'NxGen', style: { fontFamily: 'Georgia, serif', fontWeight: 600, letterSpacing: '-0.02em', fontSize: '17px' } },
  { name: 'Matter Labs', style: { fontFamily: 'Helvetica, sans-serif', fontWeight: 700, letterSpacing: '-0.01em', fontSize: '15px' } },
  { name: 'DEXTOOLS', style: { fontFamily: 'Verdana, sans-serif', fontWeight: 700, letterSpacing: '0.06em', fontSize: '14px', textTransform: 'uppercase' as const } },
  { name: 'NGRAVE', style: { fontFamily: 'Courier New, monospace', fontWeight: 700, letterSpacing: '0.18em', fontSize: '14px' } },
  { name: 'Polychain', style: { fontFamily: 'Palatino, serif', fontWeight: 500, letterSpacing: '0.03em', fontSize: '15px' } },
];

export const BackedBySection = () => {
  return (
    <section className="bg-[#F5F5F5] px-6">
      <div className="max-w-[88rem] mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 items-center">
        {/* Left: Text */}
        <div className="text-black/70 text-base leading-relaxed">
          Funded by premier partners<br />and forward-thinking leaders.
        </div>

        {/* Right: Marquee */}
        <div className="md:col-span-3 overflow-hidden">
          <div className="backers-track">
            {/* First set */}
            {backers.map((backer, idx) => (
              <div
                key={`backer-1-${idx}`}
                className="mx-10 shrink-0 text-black/50 whitespace-nowrap"
                style={backer.style}
              >
                {backer.name}
              </div>
            ))}
            {/* Duplicate for seamless loop */}
            {backers.map((backer, idx) => (
              <div
                key={`backer-2-${idx}`}
                className="mx-10 shrink-0 text-black/50 whitespace-nowrap"
                style={backer.style}
              >
                {backer.name}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
