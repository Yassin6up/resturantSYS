import React from 'react';

// Fast/casual register: big touch targets, saturated color, one-tap add -
// optimized for speed of ordering over ambience.
export default function CasualTemplate({ menu, table, addItem, onSelectItem }) {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-500 via-red-500 to-red-600 px-6 py-10 mb-10 text-center shadow-lg">
        <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/10 rounded-full" />
        <h1 className="relative text-4xl font-extrabold text-white mb-2 tracking-tight">
          What are you craving?
        </h1>
        {table && (
          <span className="relative inline-block mt-2 px-4 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-white font-bold text-sm">
            🪑 Table {table}
          </span>
        )}
      </div>

      <div className="space-y-10">
        {menu.map((category) => (
          <div key={category.id}>
            <h2 className="text-2xl font-extrabold text-gray-900 mb-4 flex items-center gap-2">
              {category.name}
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {category.items?.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onSelectItem(item)}
                  className="group cursor-pointer bg-white rounded-2xl border-2 border-transparent hover:border-orange-400 shadow-md hover:shadow-xl transition-all duration-200 overflow-hidden"
                >
                  <div className="relative aspect-square overflow-hidden bg-orange-50">
                    <img
                      src={item.image || "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=400&fit=crop"}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      onError={(e) => {
                        e.target.src = "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=400&fit=crop";
                      }}
                    />
                    <div className="absolute bottom-2 right-2 bg-gray-900 text-white text-sm font-extrabold px-2.5 py-1 rounded-full shadow-lg">
                      {parseFloat(item?.price || 0).toFixed(2)}
                    </div>
                  </div>
                  <div className="p-3">
                    <h3 className="font-bold text-gray-900 text-sm leading-tight mb-2 line-clamp-2">
                      {item.name}
                    </h3>
                    <button
                      onClick={(e) => { e.stopPropagation(); addItem(item); }}
                      className="w-full py-2 rounded-xl bg-orange-500 text-white font-extrabold text-sm hover:bg-orange-600 active:scale-95 transition-all"
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
  );
}
