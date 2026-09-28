import React from 'react';

// Fine-dining register: black/charcoal canvas, hairline gold rule, serif
// display type. Prices stay quiet (small caps, not badges) - luxury menus
// don't shout numbers.
export default function LuxuryTemplate({ menu, table, addItem, onSelectItem }) {
  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8 -my-8 bg-[#0b0b0c] px-4 sm:px-8 py-14" style={{ fontFamily: "'Playfair Display', serif" }}>
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-[#c9a961] tracking-[0.3em] text-xs uppercase mb-4" style={{ fontFamily: "'Inter', sans-serif" }}>
            The Menu
          </p>
          <h1 className="text-5xl md:text-6xl text-white font-medium mb-6">
            Tasting Menu
          </h1>
          <div className="flex items-center justify-center gap-3 mb-6">
            <span className="w-16 h-px bg-[#c9a961]/50" />
            <span className="text-[#c9a961] text-lg">✦</span>
            <span className="w-16 h-px bg-[#c9a961]/50" />
          </div>
          {table && (
            <p className="text-white/50 text-sm tracking-widest uppercase" style={{ fontFamily: "'Inter', sans-serif" }}>
              Table {table}
            </p>
          )}
        </div>

        <div className="space-y-16">
          {menu.map((category) => (
            <div key={category.id}>
              <div className="text-center mb-10">
                <h2 className="text-2xl md:text-3xl text-white tracking-wide">
                  {category.name}
                </h2>
                <span className="block w-10 h-px bg-[#c9a961] mx-auto mt-4" />
              </div>

              <div className="space-y-1">
                {category.items?.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => onSelectItem(item)}
                    className="group cursor-pointer flex items-start gap-6 py-6 border-b border-white/10 hover:border-[#c9a961]/40 transition-colors"
                  >
                    {item.image && (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-20 h-20 object-cover rounded-sm flex-shrink-0 opacity-90 group-hover:opacity-100 transition-opacity"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-4">
                        <h3 className="text-lg md:text-xl text-white group-hover:text-[#c9a961] transition-colors">
                          {item.name}
                        </h3>
                        <span className="text-[#c9a961] text-lg whitespace-nowrap">
                          {parseFloat(item?.price || 0).toFixed(0)} <span className="text-xs text-[#c9a961]/70">MAD</span>
                        </span>
                      </div>
                      {item.description && (
                        <p className="text-white/40 text-sm mt-2 leading-relaxed max-w-xl" style={{ fontFamily: "'Inter', sans-serif" }}>
                          {item.description}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); addItem(item); }}
                      className="self-center flex-shrink-0 w-9 h-9 rounded-full border border-[#c9a961]/50 text-[#c9a961] flex items-center justify-center hover:bg-[#c9a961] hover:text-black transition-all"
                      style={{ fontFamily: "'Inter', sans-serif" }}
                      aria-label="Add to order"
                    >
                      +
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
