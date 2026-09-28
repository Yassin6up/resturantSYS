import React from 'react';

// Warm register for cafes/bakeries: cream paper tones, soft serif, rounded
// polaroid-style photos.
export default function CafeTemplate({ menu, table, addItem, onSelectItem }) {
  return (
    <div className="max-w-4xl mx-auto -mx-4 sm:mx-auto px-4 py-2 bg-[#fbf4e9] rounded-3xl sm:rounded-3xl">
      <div className="text-center pt-8 pb-10">
        <span className="text-4xl">☕</span>
        <h1
          className="text-4xl text-[#6b4a34] font-semibold mt-3 mb-2"
          style={{ fontFamily: "'Fraunces', serif" }}
        >
          From Our Kitchen
        </h1>
        {table && (
          <p className="text-[#8a6a52] text-sm font-medium">Table {table}</p>
        )}
      </div>

      <div className="space-y-10 pb-8">
        {menu.map((category) => (
          <div key={category.id}>
            <h2
              className="text-2xl text-[#6b4a34] mb-5 pl-1"
              style={{ fontFamily: "'Fraunces', serif" }}
            >
              {category.name}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {category.items?.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onSelectItem(item)}
                  className="group cursor-pointer bg-white rounded-2xl p-3 flex gap-4 items-center shadow-[0_2px_10px_rgba(107,74,52,0.08)] hover:shadow-[0_6px_20px_rgba(107,74,52,0.15)] transition-shadow duration-200"
                >
                  <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 rotate-[-2deg] group-hover:rotate-0 transition-transform duration-200 shadow-sm">
                    <img
                      src={item.image || "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200&h=200&fit=crop"}
                      alt={item.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200&h=200&fit=crop";
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-[#4a3423] truncate">{item.name}</h3>
                    {item.description && (
                      <p className="text-xs text-[#8a6a52] line-clamp-1 mt-0.5">{item.description}</p>
                    )}
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[#a8672f] font-bold text-sm">
                        {parseFloat(item?.price || 0).toFixed(2)} MAD
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); addItem(item); }}
                        className="w-7 h-7 rounded-full bg-[#a8672f] text-white flex items-center justify-center text-sm hover:bg-[#8a5424] transition-colors"
                        aria-label="Add to order"
                      >
                        +
                      </button>
                    </div>
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
