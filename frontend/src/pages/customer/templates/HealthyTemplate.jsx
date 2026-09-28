import React from 'react';

// Detects dietary tags from the item's own name/description text - never
// invents nutrition data that isn't actually there.
const TAG_RULES = [
  { label: 'Vegan', keywords: ['vegan'], color: 'bg-emerald-100 text-emerald-700' },
  { label: 'Vegetarian', keywords: ['vegetarian'], color: 'bg-lime-100 text-lime-700' },
  { label: 'Gluten-free', keywords: ['gluten-free', 'gluten free'], color: 'bg-amber-100 text-amber-700' },
  { label: 'Keto', keywords: ['keto'], color: 'bg-purple-100 text-purple-700' },
  { label: 'Low-carb', keywords: ['low-carb', 'low carb'], color: 'bg-teal-100 text-teal-700' },
  { label: 'High-protein', keywords: ['protein'], color: 'bg-sky-100 text-sky-700' },
];

function detectTags(item) {
  const text = `${item.name || ''} ${item.description || ''}`.toLowerCase();
  return TAG_RULES.filter(rule => rule.keywords.some(k => text.includes(k)));
}

export default function HealthyTemplate({ menu, table, addItem, onSelectItem }) {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-50 rounded-full mb-5">
          <span className="text-3xl">🌿</span>
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-3">Eat Well Menu</h1>
        {table && (
          <p className="inline-block px-4 py-1 bg-emerald-50 text-emerald-700 rounded-full text-sm font-medium mb-3">
            Table {table}
          </p>
        )}
        <p className="text-gray-500 max-w-xl mx-auto">
          Fresh, balanced dishes made with wholesome ingredients
        </p>
      </div>

      <div className="space-y-12">
        {menu.map((category) => (
          <div key={category.id}>
            <div className="flex items-center gap-3 mb-6">
              <span className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-sm">●</span>
              <h2 className="text-xl font-semibold text-gray-900">{category.name}</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {category.items?.map((item) => {
                const tags = detectTags(item);
                return (
                  <div
                    key={item.id}
                    onClick={() => onSelectItem(item)}
                    className="group cursor-pointer bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-emerald-200 transition-all duration-200 overflow-hidden"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-emerald-50">
                      <img
                        src={item.image || "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop"}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          e.target.src = "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop";
                        }}
                      />
                      {tags.length > 0 && (
                        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 max-w-[85%]">
                          {tags.map(tag => (
                            <span key={tag.label} className={`text-[11px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-sm ${tag.color}`}>
                              {tag.label}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 leading-snug">{item.name}</h3>
                        <span className="text-emerald-700 font-bold whitespace-nowrap">
                          {parseFloat(item?.price || 0).toFixed(2)}
                        </span>
                      </div>
                      {item.description && (
                        <p className="text-sm text-gray-500 mb-4 line-clamp-2">{item.description}</p>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); addItem(item); }}
                        className="w-full py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
                      >
                        Add to plate
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
