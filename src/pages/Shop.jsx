import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api.js';
import ProductCard from '../components/ProductCard.jsx';

export default function Shop() {
  const { slug } = useParams();
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');

  useEffect(() => {
    api.getCategories().then(setCategories).catch(() => {});
  }, []);

  const activeCategory = categories.find((c) => c.slug === slug);

  useEffect(() => {
    setLoading(true);
    const params = { sort };
    if (activeCategory) params.category = activeCategory._id;
    if (search) params.search = search;
    api.getProducts(params).then(setProducts).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory?._id, search, sort]);

  return (
    <section className="container" style={{ paddingTop: 36 }}>
      <h1 style={{ fontSize: 32, marginBottom: 20 }}>
        {activeCategory ? activeCategory.name : 'Shop All'}
      </h1>

      <div className="chip-row">
        <Link to="/shop" className={`chip ${!slug ? 'active' : ''}`}>All</Link>
        {categories.map((c) => (
          <Link key={c._id} to={`/category/${c.slug}`} className={`chip ${slug === c.slug ? 'active' : ''}`}>
            {c.name}
          </Link>
        ))}
      </div>

      <div className="toolbar">
        <input
          className="search-input"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="sort-select" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="newest">Newest first</option>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
          <option value="discount-desc">Highest discount</option>
        </select>
      </div>

      {loading ? (
        <div className="empty-state">Loading...</div>
      ) : products.length === 0 ? (
        <div className="empty-state">No pieces match yet — try a different search or category.</div>
      ) : (
        <div className="product-grid">
          {products.map((p) => <ProductCard key={p._id} product={p} />)}
        </div>
      )}
    </section>
  );
}
