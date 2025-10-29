import React from 'react';

export default function DefaultTemplate({ menu, table, addItem, onSelectItem }) {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-12 animate-fadeInUp">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mb-6 shadow-xl">
          <span className="text-white font-bold text-2xl">🍽️</span>
        </div>
        <h1 className="text-4xl font-bold gradient-text mb-4">
          Our Delicious Menu
        </h1>
        {table && <p className="text-xl text-gray-600">Table {table}</p>}
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Discover our carefully crafted dishes made with love and the finest ingredients
        </p>
      </div>

      <div className="space-y-8">
        {menu.map((category) => (
          <div key={category.id} className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold text-gray-900">{category.name}</h2>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {category.items?.map((item) => (
                  <div
                    key={item.id}
                    className="menu-item-card group"
                    onClick={() => onSelectItem(item)}
                  >
                    <div className="relative overflow-hidden">
                      <img
                        src={item.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop"}
                        alt={item.name}
                        className="menu-item-image"
                        onError={(e) => {
                          e.target.src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop";
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 text-sm font-semibold text-gray-800 shadow-lg">
                        {parseFloat(item?.price || 0).toFixed(2)} MAD
                      </div>
                    </div>
                    <div className="p-6">
                      <h3 className="font-bold text-gray-900 text-lg mb-2 group-hover:text-blue-600 transition-colors duration-200">
                        {item.name}
                      </h3>
                      {item.description && (
                        <p className="text-gray-600 mb-4 line-clamp-2">{item.description}</p>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          addItem(item);
                        }}
                        className="btn-primary w-full group-hover:animate-bounce transition-transform duration-200 rounded-md h-10 flex items-center justify-center"
                      >
                        Add to Cart
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
