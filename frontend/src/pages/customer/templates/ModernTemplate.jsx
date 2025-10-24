import React from 'react';

export default function ModernTemplate({ menu, table, addItem, onSelectItem }) {
  return (
    <div className="max-w-6xl mx-auto px-4">
      <div className="mb-16 pt-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1 h-12 bg-gradient-to-b from-blue-600 to-blue-400"></div>
          <div>
            <h1 className="text-5xl font-bold text-gray-900">Menu</h1>
            {table && <p className="text-lg text-gray-500 mt-1">Table {table}</p>}
          </div>
        </div>
        <p className="text-gray-600 text-lg max-w-2xl">
          Fresh ingredients, bold flavors, exceptional experience
        </p>
      </div>

      <div className="space-y-20">
        {menu.map((category, idx) => (
          <div key={category.id} className="relative">
            <div className="flex items-center gap-6 mb-8">
              <h2 className="text-3xl font-bold text-gray-900">{category.name}</h2>
              <div className="flex-1 h-px bg-gray-200"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {category.items?.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onSelectItem(item)}
                  className="group cursor-pointer bg-white rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-100"
                >
                  <div className="flex gap-6 p-6">
                    <div className="flex-shrink-0">
                      <img
                        src={item.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop"}
                        alt={item.name}
                        className="w-32 h-32 object-cover rounded-xl"
                        onError={(e) => {
                          e.target.src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop";
                        }}
                      />
                    </div>
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                          {item.name}
                        </h3>
                        {item.description && (
                          <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                            {item.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-end justify-between">
                        <span className="text-2xl font-bold text-gray-900">
                          {parseFloat(item?.price || 0).toFixed(2)} <span className="text-lg text-gray-500">MAD</span>
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            addItem(item);
                          }}
                          className="px-6 py-2 bg-gray-900 text-white rounded-full hover:bg-blue-600 transition-colors text-sm font-medium"
                        >
                          Add
                        </button>
                      </div>
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
