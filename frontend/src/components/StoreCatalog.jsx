import { useMemo, useState } from 'react'
import { Search, ArrowUpRight, Plus, ShoppingBag, UtensilsCrossed } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'
import { useTenant } from '../contexts/TenantContext'

export default function StoreCatalog({ menu = [], addItem, onSelectItem, storeName, restaurant = false, style = 'default' }) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [sort, setSort] = useState('featured')
  const { getCurrency } = useTheme()
  const tenant = useTenant()
  const customTheme = tenant.settings?.custom_theme?.active === false ? null : tenant.settings?.custom_theme
  const products = useMemo(() => menu.flatMap(c => (c.items || []).map(p => ({...p, categoryName:c.name, categoryId:String(c.id)}))), [menu])
  const filtered = useMemo(() => {
    const result = products.filter(p => (category === 'all' || p.categoryId === category) && `${p.name} ${p.description || ''}`.toLowerCase().includes(search.toLowerCase()))
    if (sort === 'low') result.sort((a,b) => Number(a.price) - Number(b.price))
    if (sort === 'high') result.sort((a,b) => Number(b.price) - Number(a.price))
    if (sort === 'name') result.sort((a,b) => a.name.localeCompare(b.name))
    return result
  }, [products, category, search, sort])
  const featured = products.find(p => p.image)
  const name = storeName || tenant.name || (restaurant ? 'At our table' : 'The collection')
  const heroTitle = customTheme?.heroTitle || (restaurant ? 'Something worth gathering for.' : 'Find your next favorite.')
  const heroSubtitle = customTheme?.heroSubtitle || (restaurant ? 'Explore the menu, find your favorites, and let us take care of the rest.' : 'Explore our collection. Choose the details that suit you, then collect in store or request delivery.')
  return <div className={`store-catalog catalog-${style} ${restaurant ? 'catalog-restaurant' : ''}`}>
    <section className="catalog-hero">
      <div className="catalog-hero-copy"><p className="eyebrow">{restaurant ? 'GOOD FOOD. GOOD COMPANY.' : 'A LITTLE DISCOVERY, EVERY DAY.'}</p>
        <h1>{name}<span>{heroTitle}</span></h1>
        <p>{tenant.description || heroSubtitle}</p>
        <a href="#catalog-products" className="catalog-hero-link">{restaurant ? 'Explore the menu' : 'Shop the collection'} <ArrowUpRight size={20}/></a>
      </div>
      <div className="catalog-hero-image">{featured ? <img src={featured.image} alt={featured.name} /> : <div className="catalog-placeholder">{restaurant ? <UtensilsCrossed size={72}/> : <ShoppingBag size={72}/>}</div>}<span className="catalog-image-caption">{featured?.name || (restaurant ? 'Made for your table' : 'Selected for you')}</span></div>
    </section>
    <section id="catalog-products" className="scroll-mt-28">
      <div className="catalog-section-heading"><div><p className="eyebrow">{restaurant ? 'FIND YOUR FLAVOR' : 'THE EDIT'}</p><h2>{restaurant ? 'On the menu' : 'Explore the collection'}</h2></div><span aria-live="polite">{filtered.length} {restaurant ? 'dishes' : 'products'}</span></div>
      <div className="catalog-tools"><div className="catalog-search"><Search size={19}/><input aria-label={restaurant ? 'Search menu' : 'Search products'} value={search} onChange={e => setSearch(e.target.value)} placeholder={restaurant ? 'What are you craving?' : 'Search for something you love…'} /></div><select aria-label="Sort products" value={sort} onChange={e => setSort(e.target.value)}><option value="featured">Featured</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option><option value="name">Name: A to Z</option></select></div>
      <div className="catalog-categories" aria-label="Categories">{[{id:'all',name:'Everything'},...menu].map(c => <button key={c.id} aria-pressed={category === String(c.id)} className={category === String(c.id) ? 'active' : ''} onClick={() => setCategory(String(c.id))}>{c.name}</button>)}</div>
      {filtered.length ? <div className="catalog-grid">{filtered.map(item => <article key={item.id} className="catalog-card">
        <button className="catalog-product-image" onClick={() => onSelectItem(item)} aria-label={`View ${item.name}`}>
          {item.image ? <img src={item.image} alt={item.name} loading="lazy" onError={e => { e.currentTarget.style.visibility = 'hidden' }} /> : <ShoppingBag className="text-stone-400" size={44}/>}
          <span className="catalog-product-view">View details <ArrowUpRight size={16}/></span>
        </button>
        <div className="catalog-product-copy"><p className="eyebrow">{item.categoryName}</p><button onClick={() => onSelectItem(item)} className="catalog-product-name">{item.name}</button><p className="catalog-description">{item.description}</p><div className="catalog-product-bottom"><strong>{Number(item.price).toFixed(2)} <small>{getCurrency()}</small></strong><button disabled={item.is_available === false || item.is_available === 0} aria-label={`Add ${item.name} to basket`} onClick={() => addItem(item)}><Plus size={18}/><span>Add</span></button></div></div>
      </article>)}</div> : <div className="catalog-empty"><Search size={32}/><h3>No matches yet</h3><p>Try another search or explore all categories.</p><button onClick={() => {setSearch('');setCategory('all')}}>Clear filters</button></div>}
    </section>
  </div>
}
