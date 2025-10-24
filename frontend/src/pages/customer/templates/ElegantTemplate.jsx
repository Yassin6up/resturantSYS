import React from 'react';

export default function ElegantTemplate({ menu, table, addItem, onSelectItem }) {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="text-center mb-16 py-12 bg-gradient-to-r from-amber-50 to-orange-50 -mx-4 px-4 rounded-3xl">
        <div className="mb-4">
          <span className="text-6xl">🍷</span>
        </div>
        <h1 className="text-5xl font-serif font-bold text-gray-900 mb-3">
          Culinary Excellence
        </h1>
        {table && (
          <div className="inline-block px-6 py-2 bg-white rounded-full shadow-sm mb-4">
            <span className="text-gray-600">Table</span>
            <span className="ml-2 font-bold text-gray-900">{table}</span>
          </div>
        )}
        <p className="text-gray-600 max-w-2xl mx-auto text-lg italic">
          "Where every dish tells a story"
        </p>
      </div>

      <div className="space-y-16">
        {menu.map((category) => (
          <div key={category.id}>
            <div className="text-center mb-10">
              <h2 className="text-3xl font-serif font-bold text-gray-900 mb-2">
                {category.name}
              </h2>
              <div className="w-24 h-1 bg-gradient-to-r from-amber-400 to-orange-400 mx-auto rounded-full"></div>
            </div>

            <div className="space-y-6">
              {category.items?.map((item, idx) => (
                <div
                  key={item.id}
                  onClick={() => onSelectItem(item)}
                  className={`group cursor-pointer bg-white rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-500 border border-gray-100 ${idx % 2 === 0 ? 'hover:translate-x-2' : 'hover:-translate-x-2'}`}
                >
                  <div className="flex flex-col md:flex-row">
                    <div className="md:w-2/5 relative overflow-hidden">
                      <img
                        src={item.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&h=400&fit=crop"}
                        alt={item.name}
                        className="w-full h-64 md:h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        onError={(e) => {
                          e.target.src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&h=400&fit=crop";
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
                    </div>
                    <div className="md:w-3/5 p-8 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <h3 className="text-2xl font-serif font-bold text-gray-900 group-hover:text-amber-600 transition-colors">
                            {item.name}
                          </h3>
                          <div className="ml-4 flex-shrink-0">
                            <span className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                              {parseFloat(item?.price || 0).toFixed(2)}
                            </span>
                            <span className="text-sm text-gray-500 ml-1">MAD</span>
                          </div>
                        </div>
                        {item.description && (
                          <p className="text-gray-600 leading-relaxed mb-6">
                            {item.description}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          addItem(item);
                        }}
                        className="self-start px-8 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full hover:shadow-lg hover:scale-105 transition-all duration-300 font-medium"
                      >
                        Add to Order
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
