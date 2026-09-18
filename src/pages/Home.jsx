import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import ProductCard from '../components/ProductCard.jsx';

export default function Home() {
  const [categories, setCategories] = useState([]);
  const [featured, setFeatured] = useState([]);

  useEffect(() => {
    api.getCategories().then(setCategories).catch(() => {});
    api.getProducts({ sort: 'newest' }).then((p) => setFeatured(p.slice(0, 8))).catch(() => {});
  }, []);

  const heroImages = featured.slice(0, 3).map((p) => p.images?.[0]).filter(Boolean);

  return (
    <>
      <section className="container hero">
        <div>
          <div className="hero-eyebrow">Handmade, made to order</div>
          <h1>Little stitches, made with care.</h1>
          <p>
            Cozy Loopz is a small crochet shop making gifts, bags, keychains and bouquets
            by hand — each piece worked stitch by stitch and made just for you.
          </p>
          <div className="hero-actions">
            <Link to="/shop" className="btn btn-primary">Shop all pieces</Link>
            <Link to="/shop" className="btn btn-outline">Browse categories</Link>
          </div>
        </div>
        <div className="hero-collage">
          {heroImages[0] && <img className="c1" src={heroImages[0]} alt="" />}
          {heroImages[1] && <img className="c2" src={heroImages[1]} alt="" />}
          {heroImages[2] && <img className="c3" src={heroImages[2]} alt="" />}
        </div>
      </section>

      <div className="stitch-divider" />

      <section className="container" style={{ paddingTop: 40 }}>
        <h2 style={{ fontSize: 26, marginBottom: 18 }}>Shop by category</h2>
        <div className="chip-row">
          {categories.map((c) => (
            <Link key={c._id} to={`/category/${c.slug}`} className="chip">
              {c.name}
            </Link>
          ))}
        </div>
      </section>

      <section className="container" style={{ paddingTop: 10 }}>
        <h2 style={{ fontSize: 26, marginBottom: 18 }}>Newly made</h2>
        {featured.length === 0 ? (
          <div className="empty-state">New pieces are on the hook — check back soon.</div>
        ) : (
          <div className="product-grid">
            {featured.map((p) => <ProductCard key={p._id} product={p} />)}
          </div>
        )}
      </section>
    </>
  );
}
