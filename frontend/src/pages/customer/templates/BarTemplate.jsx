import React from 'react';

// Bar/pub/nightlife register: near-black canvas, neon accent, bold rounded
// type - built to read well in a dim room.
export default function BarTemplate({ menu, table, addItem, onSelectItem }) {
  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8 -my-8 bg-[#0f0a17] px-4 sm:px-8 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-14">
          <h1
            className="text-5xl font-extrabold mb-3 bg-gradient-to-r from-[#ff2fb0] via-[#a855f7] to-[#22d3ee] bg-clip-text text-transparent"
          >
            Drinks & Bites
          </h1>
          {table && (
            <span className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-[#a855f7]/30 text-[#e9d5ff] text-sm font-medium">
              Table {table}
            </span>
          )}
        </div>

        <div className="space-y-12">
          {menu.map((category) => (
            <div key={category.id}>
              <h2 className="text-xl font-bold text-white mb-5 flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-[#22d3ee] shadow-[0_0_8px_2px_rgba(34,211,238,0.6)]" />
                {category.name}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {category.items?.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => onSelectItem(item)}
                    className="group cursor-pointer bg-white/5 backdrop-blur-sm rounded-xl overflow-hidden border border-white/10 hover:border-[#a855f7]/50 transition-colors flex"
                  >
                    <div className="w-24 h-24 flex-shrink-0 overflow-hidden">
                      <img
                        src={item.image || "https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=300&h=300&fit=crop"}
                        alt={item.name}
                        className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300"
                        onError={(e) => {
                          e.target.src = "https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=300&h=300&fit=crop";
                        }}
                      />
                    </div>
                    <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
                      <div>
                        <div className="flex justify-between items-start gap-2">
                          <h3 className="font-bold text-white text-sm">{item.name}</h3>
                          <span className="text-[#22d3ee] font-bold text-sm whitespace-nowrap">
                            {parseFloat(item?.price || 0).toFixed(0)}
                          </span>
                        </div>
                        {item.description && (
                          <p className="text-white/50 text-xs mt-1 line-clamp-2">{item.description}</p>
                        )}
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); addItem(item); }}
                        className="mt-2 self-start px-3 py-1 rounded-full bg-gradient-to-r from-[#a855f7] to-[#22d3ee] text-white text-xs font-bold hover:opacity-90 transition-opacity"
                      >
                        + Add
                      </button>
                    </div>
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
