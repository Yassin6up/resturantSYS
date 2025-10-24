import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useCart } from "../../contexts/CartContext";
import { menuAPI } from "../../services/api";
import { PlusIcon, MinusIcon, XMarkIcon, SparklesIcon } from "@heroicons/react/24/outline";
import CartBottomBar from "../../components/CartBottomBar";
import toast from "react-hot-toast";

function MenuPage() {
  const [searchParams] = useSearchParams();
  const table = searchParams.get("table");
  const branch = searchParams.get("branch") || "1";

  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedModifiers, setSelectedModifiers] = useState([]);
  const [note, setNote] = useState("");

  const { addItem, setBranchInfo } = useCart();

  useEffect(() => {
    setBranchInfo(parseInt(branch), table);
  }, [branch, table]);

  useEffect(() => {
    loadMenu();
  }, [branch]);

  const loadMenu = async () => {
    try {
      setLoading(true);
      const response = await menuAPI.getMenu({ branchId: parseInt(branch) });
      setMenu(response.data.categories);
    } catch (error) {
      toast.error("Failed to load menu");
      console.error("Menu load error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (!selectedItem) return;

    addItem(
      selectedItem,
      quantity,
      selectedModifiers,
      note,
      parseInt(branch),
      table,
    );

    toast.success(`${quantity}x ${selectedItem.name} added to cart!`);
    setSelectedItem(null);
    setQuantity(1);
    setSelectedModifiers([]);
    setNote("");
  };

  const toggleModifier = (modifier) => {
    setSelectedModifiers((prev) => {
      const exists = prev.find((m) => m.id === modifier.id);
      if (exists) {
        return prev.filter((m) => m.id !== modifier.id);
      } else {
        return [...prev, modifier];
      }
    });
  };

  const calculateItemTotal = (item) => {
    const modifierTotal = selectedModifiers.reduce((sum, modifier) => {
      return sum + parseFloat(modifier.extra_price || 0);
    }, 0);
    return (parseFloat(item.price || 0) + modifierTotal) * quantity;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <div className="text-center">
          <div className="inline-block h-16 w-16 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent mb-4"></div>
          <p className="text-gray-600 font-medium">Loading delicious menu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Modern Hero Header */}
        <div className="text-center mb-12 relative">
          <div className="absolute inset-0 flex items-center justify-center opacity-5">
            <SparklesIcon className="h-64 w-64 text-blue-600" />
          </div>
          <div className="relative">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 rounded-3xl mb-6 shadow-2xl shadow-blue-500/30 transform hover:scale-105 transition-transform duration-300">
              <span className="text-5xl">🍽️</span>
            </div>
            <h1 className="text-5xl sm:text-6xl font-black mb-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Our Menu
            </h1>
            {table && (
              <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full font-bold text-lg shadow-lg shadow-blue-500/30 mb-4">
                <span>Table {table}</span>
              </div>
            )}
            <p className="text-lg text-gray-600 max-w-2xl mx-auto font-medium">
              Crafted with passion, served with excellence
            </p>
          </div>
        </div>

        {/* Menu Grid */}
        <div className="space-y-12">
          {menu.map((category) => (
            <div key={category.id} className="space-y-6">
              <div className="flex items-center gap-4">
                <h2 className="text-3xl font-bold text-gray-900">{category.name}</h2>
                <div className="flex-1 h-1 bg-gradient-to-r from-blue-600 to-transparent rounded-full"></div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {category.items?.map((item) => (
                  <div
                    key={item.id}
                    className="group relative bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer border border-gray-100"
                    onClick={() => setSelectedItem(item)}
                  >
                    {/* Image Container */}
                    <div className="relative h-48 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                        onError={(e) => {
                          e.target.src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop";
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      
                      {/* Price Badge */}
                      <div className="absolute top-3 right-3 px-4 py-2 bg-white/95 backdrop-blur-md rounded-full shadow-lg">
                        <span className="font-bold text-gray-900">{parseFloat(item?.price || 0).toFixed(2)}</span>
                        <span className="text-xs text-gray-600 ml-1">MAD</span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-5">
                      <h3 className="font-bold text-lg text-gray-900 mb-2 group-hover:text-blue-600 transition-colors duration-200 line-clamp-1">
                        {item.name}
                      </h3>
                      {item.description && (
                        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                          {item.description}
                        </p>
                      )}
                      
                      {/* Quick Add Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          addItem(item, 1, [], '', parseInt(branch), table);
                          toast.success(`${item.name} added!`);
                        }}
                        className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transform transition-all duration-200 active:scale-95 flex items-center justify-center gap-2"
                      >
                        <PlusIcon className="h-5 w-5" />
                        <span>Quick Add</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Item Details Modal */}
        {selectedItem && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-scaleIn">
              {/* Image Header */}
              <div className="relative h-64 bg-gradient-to-br from-gray-100 to-gray-200">
                <img
                  src={selectedItem.image}
                  alt={selectedItem.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=400&fit=crop";
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                
                {/* Close Button */}
                <button
                  onClick={() => setSelectedItem(null)}
                  className="absolute top-4 right-4 p-2 bg-white/90 backdrop-blur-md rounded-full hover:bg-white transition-colors shadow-lg"
                >
                  <XMarkIcon className="h-6 w-6 text-gray-700" />
                </button>
                
                {/* Price Badge */}
                <div className="absolute bottom-4 right-4 px-6 py-3 bg-white/95 backdrop-blur-md rounded-full shadow-lg">
                  <span className="font-bold text-2xl text-gray-900">{parseFloat(selectedItem.price || 0).toFixed(2)}</span>
                  <span className="text-sm text-gray-600 ml-1">MAD</span>
                </div>
              </div>

              {/* Content */}
              <div className="p-8">
                <h3 className="text-3xl font-bold text-gray-900 mb-4">
                  {selectedItem.name}
                </h3>

                {selectedItem.description && (
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    {selectedItem.description}
                  </p>
                )}

                {/* Modifiers */}
                {selectedItem.modifiers && selectedItem.modifiers.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <SparklesIcon className="h-5 w-5 text-purple-600" />
                      Customize Your Order
                    </h4>
                    <div className="space-y-2">
                      {selectedItem.modifiers.map((modifier) => (
                        <label
                          key={modifier.id}
                          className="flex items-center p-3 bg-gray-50 rounded-xl hover:bg-gray-100 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={selectedModifiers.some((m) => m.id === modifier.id)}
                            onChange={() => toggleModifier(modifier)}
                            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
                          />
                          <span className="ml-3 flex-1 text-gray-700 font-medium">
                            {modifier.name}
                          </span>
                          {parseFloat(modifier.extra_price || 0) > 0 && (
                            <span className="text-blue-600 font-semibold">
                              +{parseFloat(modifier.extra_price || 0).toFixed(2)} MAD
                            </span>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Special Instructions */}
                <div className="mb-6">
                  <label className="block font-bold text-gray-900 mb-2">
                    Special Instructions
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Any special requests? (e.g., no onions, extra spicy)"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                    rows={3}
                  />
                </div>

                {/* Quantity Selector */}
                <div className="mb-6">
                  <label className="block font-bold text-gray-900 mb-3">
                    Quantity
                  </label>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="p-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors active:scale-95"
                    >
                      <MinusIcon className="h-6 w-6 text-gray-700" />
                    </button>
                    <span className="text-2xl font-bold text-gray-900 min-w-[3rem] text-center">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="p-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors active:scale-95"
                    >
                      <PlusIcon className="h-6 w-6 text-gray-700" />
                    </button>
                  </div>
                </div>

                {/* Total Display */}
                <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border-2 border-blue-100">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-700">Total:</span>
                    <span className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      {calculateItemTotal(selectedItem).toFixed(2)} MAD
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setSelectedItem(null)}
                    className="flex-1 py-4 px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddToCart}
                    className="flex-1 py-4 px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <PlusIcon className="h-6 w-6" />
                    <span>Add to Cart</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cart Bottom Bar */}
        <CartBottomBar />
      </div>
    </div>
  );
}

export default MenuPage;
