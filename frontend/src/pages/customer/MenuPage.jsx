import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useCart } from "../../contexts/CartContext";
import { useTheme } from "../../contexts/ThemeContext";
import { menuAPI } from "../../services/api";
import { PlusIcon, MinusIcon } from "@heroicons/react/24/outline";
import CartBottomBar from "../../components/CartBottomBar";
import toast from "react-hot-toast";

import DefaultTemplate from "./templates/DefaultTemplate";
import ModernTemplate from "./templates/ModernTemplate";
import ElegantTemplate from "./templates/ElegantTemplate";
import MinimalTemplate from "./templates/MinimalTemplate";

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
  const [selectedVariant, setSelectedVariant] = useState(null); // Single variant or null
  const [variants, setVariants] = useState([]);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [itemsWithVariants, setItemsWithVariants] = useState(new Set());

  const { addItem, setBranchInfo } = useCart();
  const { getSetting } = useTheme();

  const menuTemplate = getSetting('menu_template') || 'default';

  useEffect(() => {
    console.log('MenuPage: Setting branch info', { branch: parseInt(branch), table });
    setBranchInfo(parseInt(branch), table);
  }, [branch, table, setBranchInfo]);

  useEffect(() => {
    loadMenu();
  }, [branch]);

  const loadMenu = async () => {
    try {
      setLoading(true);
      const response = await menuAPI.getMenu({ branchId: parseInt(branch) });
      setMenu(response.data.categories);
      
      await preloadVariantsInfo(response.data.categories);
    } catch (error) {
      toast.error("Failed to load menu");
      console.error("Menu load error:", error);
    } finally {
      setLoading(false);
    }
  };

  const preloadVariantsInfo = async (categories) => {
    const itemsWithVariantsSet = new Set();
    
    for (const category of categories) {
      for (const item of category.items) {
        try {
          const response = await menuAPI.getMenuItemVariants(item.id);
          if (response.data.variants && response.data.variants.length > 0) {
            itemsWithVariantsSet.add(item.id);
          }
        } catch (error) {
          console.error(`Failed to load variants for item ${item.id}:`, error);
        }
      }
    }
    
    setItemsWithVariants(itemsWithVariantsSet);
  };

  useEffect(() => {
    if (selectedItem) {
      loadVariants(selectedItem.id);
    } else {
      setVariants([]);
      setSelectedVariant(null);
    }
  }, [selectedItem]);

  const loadVariants = async (menuItemId) => {
    try {
      setLoadingVariants(true);
      const response = await menuAPI.getMenuItemVariants(menuItemId);
      setVariants(response.data.variants || []);
      setSelectedVariant(null); // Reset selection when loading new item
    } catch (error) {
      console.error("Failed to load variants:", error);
      setVariants([]);
    } finally {
      setLoadingVariants(false);
    }
  };

  const handleVariantSelect = (variant) => {
    // If clicking the same variant that's already selected, unselect it
    if (selectedVariant?.id === variant.id) {
      setSelectedVariant(null);
    } else {
      // Otherwise select the new variant (deselect any previous one)
      setSelectedVariant(variant);
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
      selectedVariant // Pass single variant or null
    );

    const variantText = selectedVariant ? ` with ${selectedVariant.name}` : '';
    
    toast.success(`${quantity}x ${selectedItem.name}${variantText} added to cart`);
    setSelectedItem(null);
    setQuantity(1);
    setSelectedModifiers([]);
    setSelectedVariant(null);
    setNote("");
  };

  const handleBuyClick = async (item) => {
    if (itemsWithVariants.has(item.id)) {
      setSelectedItem(item);
      setQuantity(1);
      setSelectedModifiers([]);
      setSelectedVariant(null);
      setNote("");
    } else {
      addItem(item, 1, [], "", parseInt(branch), table, null);
      toast.success(`${item.name} added to cart`);
    }
  };

  const quickAddItem = (item) => {
    if (!itemsWithVariants.has(item.id)) {
      addItem(item, 1, [], "", parseInt(branch), table, null);
      toast.success(`${item.name} added to cart`);
    } else {
      handleBuyClick(item);
    }
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
    const basePrice = parseFloat(item.price || 0);
    const variantPrice = selectedVariant ? parseFloat(selectedVariant.price_adjustment || 0) : 0;
    const modifierTotal = selectedModifiers.reduce((sum, modifier) => {
      return sum + parseFloat(modifier.extra_price || 0);
    }, 0);
    
    const itemPrice = basePrice + variantPrice + modifierTotal;
    return itemPrice * quantity;
  };

  const getCurrentItemPrice = () => {
    if (!selectedItem) return 0;
    
    const basePrice = parseFloat(selectedItem.price || 0);
    const variantPrice = selectedVariant ? parseFloat(selectedVariant.price_adjustment || 0) : 0;
    
    return basePrice + variantPrice;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading menu...</p>
        </div>
      </div>
    );
  }

  const templates = {
    default: DefaultTemplate,
    modern: ModernTemplate,
    elegant: ElegantTemplate,
    minimal: MinimalTemplate
  };

  const SelectedTemplate = templates[menuTemplate] || DefaultTemplate;

  return (
    <>
      <SelectedTemplate
        menu={menu}
        table={table}
        addItem={handleBuyClick}
        onSelectItem={setSelectedItem}
        itemsWithVariants={itemsWithVariants}
      />

      {selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="relative overflow-hidden">
              <img
                src={
                  selectedItem.image ||
                  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop"
                }
                alt={selectedItem.name}
                className="w-full h-48 object-cover"
                onError={(e) => {
                  e.target.src =
                    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop";
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
              <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 text-lg font-bold text-gray-800 shadow-lg">
                {getCurrentItemPrice().toFixed(2)} MAD
              </div>
            </div>

            <div className="p-4">
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedItem.name}
                </h3>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {selectedItem.description && (
                <p className="text-gray-600 mb-3 text-sm">{selectedItem.description}</p>
              )}

              {/* Variants Section - Single selection with unselect */}
              {variants.length > 0 && (
                <div className="mb-3">
                  <h4 className="font-medium text-gray-900 mb-2">
                    Options (Optional)
                  </h4>
                  <p className="text-sm text-gray-500 mb-2">
                    Choose one option, or skip to order without options
                  </p>
                  {loadingVariants ? (
                    <div className="text-center py-2">
                      <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                      <span className="ml-2 text-sm text-gray-600">Loading options...</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {variants.map((variant) => (
                        <label key={variant.id} className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedVariant?.id === variant.id}
                            onChange={() => handleVariantSelect(variant)}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                          />
                          <span className="ml-2 text-sm text-gray-700 flex-1">
                            {variant.name}
                            {parseFloat(variant.price_adjustment || 0) !== 0 && (
                              <span className={`ml-1 ${variant.price_adjustment > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {variant.price_adjustment > 0 ? '+' : ''}
                                {parseFloat(variant.price_adjustment || 0).toFixed(2)} MAD
                              </span>
                            )}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {selectedItem.modifiers && selectedItem.modifiers.length > 0 && (
                <div className="mb-3">
                  <h4 className="font-medium text-gray-900 mb-2">Extras</h4>
                  <div className="space-y-2">
                    {selectedItem.modifiers.map((modifier) => (
                      <label key={modifier.id} className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedModifiers.some((m) => m.id === modifier.id)}
                          onChange={() => toggleModifier(modifier)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                        />
                        <span className="ml-2 text-sm text-gray-700 flex-1">
                          {modifier.name}
                          {parseFloat(modifier.extra_price || 0) > 0 && (
                            <span className="text-green-600 ml-1">
                              (+{parseFloat(modifier.extra_price || 0).toFixed(2)} MAD)
                            </span>
                          )}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Special Instructions
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Any special requests?"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows={2}
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity
                </label>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                    disabled={quantity <= 1}
                  >
                    <MinusIcon className="h-4 w-4" />
                  </button>
                  <span className="text-lg font-medium w-8 text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <PlusIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center mb-4">
                <span className="text-lg font-semibold">Total:</span>
                <span className="text-lg font-bold text-primary-600">
                  {calculateItemTotal(selectedItem).toFixed(2)} MAD
                </span>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setSelectedItem(null)}
                  className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddToCart}
                  className="flex-1 py-2 px-4 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors font-medium"
                >
                  {selectedVariant ? 'Add with Option' : 'Add to Cart'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <CartBottomBar />
    </>
  );
}

export default MenuPage;