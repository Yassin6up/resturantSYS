import React from 'react';

export default function MinimalTemplate({ menu, table, addItem, onSelectItem }) {
  return (
    <div className="max-w-7xl mx-auto px-4">
      <div className="mb-12 py-8 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-light text-gray-900 tracking-tight">Menu</h1>
            {table && (
              <p className="text-gray-500 mt-2">Table № {table}</p>
            )}
          </div>
          <div className="w-12 h-12 rounded-full bg-gray-900 flex items-center justify-center">
            <span className="text-white text-xl">🍽</span>
          </div>
        </div>
      </div>

      <div className="space-y-16">
        {menu.map((category) => (
          <div key={category.id}>
            <h2 className="text-2xl font-light text-gray-900 mb-8 pb-3 border-b border-gray-200">
              {category.name}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {category.items?.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onSelectItem(item)}
                  className="group cursor-pointer bg-white border border-gray-200 rounded-lg overflow-hidden hover:border-gray-900 hover:shadow-md transition-all duration-200"
                >
                  <div className="aspect-square relative overflow-hidden bg-gray-50">
                    <img
                      src={item.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=400&fit=crop"}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        e.target.src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=400&fit=crop";
                      }}
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-medium text-gray-900 mb-1 group-hover:text-gray-600 transition-colors">
                      {item.name}
                    </h3>
                    {item.description && (
                      <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                        {item.description}
                      </p>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-medium text-gray-900">
                        {parseFloat(item?.price || 0).toFixed(2)}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          addItem(item);
                        }}
                        className="w-8 h-8 rounded-full border border-gray-900 flex items-center justify-center hover:bg-gray-900 hover:text-white transition-colors group-hover:scale-110"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
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
