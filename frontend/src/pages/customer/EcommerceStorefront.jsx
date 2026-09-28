import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useCart } from "../../contexts/CartContext";
import { useTheme } from "../../contexts/ThemeContext";
import { menuAPI } from "../../services/api";
import { PlusIcon, MinusIcon } from "@heroicons/react/24/outline";
import { useTenant } from "../../contexts/TenantContext";
import toast from "react-hot-toast";

import StoreDefaultTemplate from "./templates/store/StoreDefaultTemplate";
import StoreMinimalTemplate from "./templates/store/StoreMinimalTemplate";
import StoreBoldTemplate from "./templates/store/StoreBoldTemplate";

const STORE_TEMPLATES = {
  default: StoreDefaultTemplate,
  minimal: StoreMinimalTemplate,
  bold: StoreBoldTemplate,
};

// The ecommerce vertical's product catalog + cart flow. Products are stored
// in the same menu_items/categories tables the restaurant vertical uses (a
// "product" is just a menu item without table/kitchen framing) - only the
// storefront presentation differs, via its own STORE_TEMPLATES set.
export default function EcommerceStorefront({ storeName }) {
  const [searchParams] = useSearchParams();
  const tenant = useTenant();
  const branch = tenant.id || searchParams.get("branch") || "1";

  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedModifiers, setSelectedModifiers] = useState([]);
  const [note, setNote] = useState("");
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [variants, setVariants] = useState([]);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [itemsWithVariants, setItemsWithVariants] = useState(new Set());

  const { addItem, setBranchInfo } = useCart();
  const { getSetting } = useTheme();

  const storeTemplate = (tenant.settings?.custom_theme?.active ? tenant.settings.custom_theme.template : null) || tenant.settings?.store_template || getSetting('store_template') || 'default';

  useEffect(() => {
    setBranchInfo(parseInt(branch), null);
  }, [branch, setBranchInfo]);

  useEffect(() => {
    loadProducts();
  }, [branch]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await menuAPI.getMenu({ branchId: parseInt(branch) });
      setMenu(response.data.categories);
      
    } catch (error) {
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const preloadVariantsInfo = async (categories) => {
    const withVariants = new Set();
    for (const category of categories) {
      for (const item of category.items) {
        try {
          const response = await menuAPI.getMenuItemVariants(item.id);
          if (response.data.variants?.length > 0) withVariants.add(item.id);
        } catch (error) {
          // ignore - item just won't show variant options
        }
      }
    }
    setItemsWithVariants(withVariants);
  };

  useEffect(() => {
    if (selectedItem) {
      loadVariants(selectedItem.id);
    } else {
      setVariants([]);
      setSelectedVariant(null);
    }
  }, [selectedItem]);

  const loadVariants = async (itemId) => {
    try {
      setLoadingVariants(true);
      const response = await menuAPI.getMenuItemVariants(itemId);
      setVariants(response.data.variants || []);
      setSelectedVariant(null);
    } catch (error) {
      setVariants([]);
    } finally {
      setLoadingVariants(false);
    }
  };

  const handleVariantSelect = (variant) => {
    setSelectedVariant(selectedVariant?.id === variant.id ? null : variant);
  };

  const toggleModifier = (modifier) => {
    setSelectedModifiers((prev) =>
      prev.find((m) => m.id === modifier.id)
        ? prev.filter((m) => m.id !== modifier.id)
        : [...prev, modifier]
    );
  };

  const handleAddToCart = () => {
    if (!selectedItem || loadingVariants) return;
    addItem(selectedItem, quantity, selectedModifiers, note, parseInt(branch), null, selectedVariant);
    const variantText = selectedVariant ? ` (${selectedVariant.name})` : '';
    toast.success(`${quantity}x ${selectedItem.name}${variantText} added to cart`);
    setSelectedItem(null);
    setQuantity(1);
    setSelectedModifiers([]);
    setSelectedVariant(null);
    setNote("");
  };

  const handleProductClick = (item) => {
    setSelectedItem(item); setQuantity(1); setSelectedModifiers([]); setSelectedVariant(null); setNote('');
  };

  const getCurrentItemPrice = () => {
    if (!selectedItem) return 0;
    const basePrice = parseFloat(selectedItem.price || 0);
    const variantPrice = selectedVariant ? parseFloat(selectedVariant.price_adjustment || 0) : 0;
    return basePrice + variantPrice;
  };

  const calculateItemTotal = (item) => {
    const modifierTotal = selectedModifiers.reduce((sum, m) => sum + parseFloat(m.extra_price || 0), 0);
    return (getCurrentItemPrice() + modifierTotal) * quantity;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading products...</p>
        </div>
      </div>
    );
  }

  const SelectedTemplate = STORE_TEMPLATES[storeTemplate] || StoreDefaultTemplate;

  return (
    <>
      <SelectedTemplate
        menu={menu}
        addItem={handleProductClick}
        onSelectItem={item => { setQuantity(1); setSelectedModifiers([]); setNote(""); setSelectedVariant(null); setSelectedItem(item); }}
        storeName={storeName}
      />

      {selectedItem && (
        <div role="dialog" aria-modal="true" aria-label="Product details" className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="relative overflow-hidden">
              <img
                src={selectedItem.image || "https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=400&h=400&fit=crop"}
                alt={selectedItem.name}
                className="w-full h-48 object-cover"
              />
              <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 text-lg font-bold text-gray-800 shadow-lg">
                {getCurrentItemPrice().toFixed(2)} MAD
              </div>
            </div>

            <div className="p-4">
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-semibold text-gray-900">{selectedItem.name}</h3>
                <button onClick={() => setSelectedItem(null)} className="text-gray-400 hover:text-gray-600 p-1">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {selectedItem.description && (
                <p className="text-gray-600 mb-3 text-sm">{selectedItem.description}</p>
              )}

              {variants.length > 0 && (
                <div className="mb-3">
                  <h4 className="font-medium text-gray-900 mb-2">Options</h4>
                  {loadingVariants ? (
                    <p className="text-sm text-gray-500">Loading options...</p>
                  ) : (
                    <div className="space-y-2">
                      {variants.map((variant) => (
                        <label key={variant.id} className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedVariant?.id === variant.id}
                            onChange={() => handleVariantSelect(variant)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700 flex-1">
                            {variant.name}
                            {parseFloat(variant.price_adjustment || 0) !== 0 && (
                              <span className={`ml-1 ${variant.price_adjustment > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {variant.price_adjustment > 0 ? '+' : ''}{parseFloat(variant.price_adjustment || 0).toFixed(2)} MAD
                              </span>
                            )}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {selectedItem.modifiers?.length > 0 && (
                <div className="mb-3">
                  <h4 className="font-medium text-gray-900 mb-2">Add-ons</h4>
                  <div className="space-y-2">
                    {selectedItem.modifiers.map((modifier) => (
                      <label key={modifier.id} className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedModifiers.some((m) => m.id === modifier.id)}
                          onChange={() => toggleModifier(modifier)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700 flex-1">
                          {modifier.name}
                          {parseFloat(modifier.extra_price || 0) > 0 && (
                            <span className="text-green-600 ml-1">(+{parseFloat(modifier.extra_price || 0).toFixed(2)} MAD)</span>
                          )}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Anything we should know about this order?"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                <div className="flex items-center space-x-3">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={quantity <= 1}
                    className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-md hover:bg-gray-50">
                    <MinusIcon className="h-4 w-4" />
                  </button>
                  <span className="text-lg font-medium w-8 text-center">{quantity}</span>
                  <button onClick={() => setQuantity(quantity + 1)}
                    className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-md hover:bg-gray-50">
                    <PlusIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center mb-4">
                <span className="text-lg font-semibold">Total:</span>
                <span className="text-lg font-bold text-blue-600">{calculateItemTotal(selectedItem).toFixed(2)} MAD</span>
              </div>

              <div className="flex space-x-3">
                <button onClick={() => setSelectedItem(null)} className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium">
                  Cancel
                </button>
                <button onClick={handleAddToCart} className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium">
                  Add to Cart
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      
    </>
  );
}
