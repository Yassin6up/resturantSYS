import React from 'react';

// Japanese/sushi register: off-white canvas, thin typography, generous
// whitespace, a single red accent - precision over decoration.
export default function SushiTemplate({ menu, table, addItem, onSelectItem }) {
  return (
    <div className="max-w-4xl mx-auto bg-[#faf8f5] -mx-4 sm:mx-auto px-4 sm:px-8 py-10 rounded-2xl">
      <div className="text-center mb-14">
        <span className="inline-block w-3 h-3 rounded-full bg-[#c23b3b] mb-4" />
        <h1 className="text-4xl text-[#2b2b2b] font-light tracking-[0.15em] uppercase mb-2">
          Menu
        </h1>
        {table && <p className="text-[#8a8a8a] text-xs tracking-[0.2em] uppercase">Table {table}</p>}
      </div>

      <div className="space-y-14">
        {menu.map((category) => (
          <div key={category.id}>
            <h2 className="text-lg text-[#2b2b2b] font-light tracking-[0.1em] uppercase mb-6 pb-2 border-b border-[#e5e0d8]">
              {category.name}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
              {category.items?.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onSelectItem(item)}
                  className="group cursor-pointer flex gap-4 items-start"
                >
                  <div className="w-16 h-16 flex-shrink-0 rounded-full overflow-hidden bg-[#f0ece4]">
                    <img
                      src={item.image || "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=200&h=200&fit=crop"}
                      alt={item.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=200&h=200&fit=crop";
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline gap-2">
                      <h3 className="text-[#2b2b2b] font-medium tracking-wide group-hover:text-[#c23b3b] transition-colors">
                        {item.name}
                      </h3>
                      <span className="text-[#c23b3b] text-sm font-medium whitespace-nowrap">
                        {parseFloat(item?.price || 0).toFixed(2)}
                      </span>
                    </div>
                    {item.description && (
                      <p className="text-xs text-[#9a9a9a] mt-1 line-clamp-2">{item.description}</p>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); addItem(item); }}
                      className="mt-2 text-xs uppercase tracking-wider text-[#2b2b2b] border-b border-[#2b2b2b] hover:text-[#c23b3b] hover:border-[#c23b3b] transition-colors"
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
  );
}
