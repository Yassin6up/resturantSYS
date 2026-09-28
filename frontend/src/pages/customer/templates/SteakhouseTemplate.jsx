import React from 'react';

// Steakhouse/BBQ register: dark wood tones, brick-red accent, heavy slab
// serif - a hearty, no-nonsense grill-house feel.
export default function SteakhouseTemplate({ menu, table, addItem, onSelectItem }) {
  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8 -my-8 bg-[#1c1410] px-4 sm:px-8 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-14">
          <span className="inline-block text-4xl mb-3">🔥</span>
          <h1 className="text-5xl text-[#f4ebe0] font-black uppercase tracking-tight mb-3" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
            The Grill House
          </h1>
          <div className="w-24 h-1.5 bg-[#b5482a] mx-auto mb-4" />
          {table && (
            <p className="text-[#c9a679] text-sm uppercase tracking-[0.2em] font-semibold">Table {table}</p>
          )}
        </div>

        <div className="space-y-12">
          {menu.map((category) => (
            <div key={category.id}>
              <div className="flex items-center gap-4 mb-6">
                <h2 className="text-2xl text-[#f4ebe0] font-bold uppercase tracking-wide whitespace-nowrap">
                  {category.name}
                </h2>
                <span className="flex-1 h-0.5 bg-[#3d2f24]" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {category.items?.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => onSelectItem(item)}
                    className="group cursor-pointer bg-[#2a2019] rounded-lg overflow-hidden border border-[#3d2f24] hover:border-[#b5482a] transition-colors flex"
                  >
                    <div className="w-28 h-28 flex-shrink-0 overflow-hidden">
                      <img
                        src={item.image || "https://images.unsplash.com/photo-1544025162-d76694265947?w=300&h=300&fit=crop"}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          e.target.src = "https://images.unsplash.com/photo-1544025162-d76694265947?w=300&h=300&fit=crop";
                        }}
                      />
                    </div>
                    <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
                      <div>
                        <div className="flex justify-between items-start gap-2">
                          <h3 className="font-bold text-[#f4ebe0] uppercase text-sm tracking-wide">{item.name}</h3>
                          <span className="text-[#e8834f] font-black whitespace-nowrap">
                            {parseFloat(item?.price || 0).toFixed(0)}
                          </span>
                        </div>
                        {item.description && (
                          <p className="text-[#a08b76] text-xs mt-1.5 line-clamp-2">{item.description}</p>
                        )}
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); addItem(item); }}
                        className="mt-2 self-start px-4 py-1.5 bg-[#b5482a] text-[#f4ebe0] text-xs font-bold uppercase tracking-wide rounded hover:bg-[#96391f] transition-colors"
                      >
                        Add
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
