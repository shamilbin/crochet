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

  return (
    <>
      <section className="container">
        <div className="hero">
          <div className="hero-content">
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
        </div>
      </section>

      <div className="stitch-divider" />

      <section className="container home-section home-categories">
        <div className="section-heading">
          <div>
            <span className="section-kicker">Find your favourite</span>
            <h2>Shop by category</h2>
          </div>
          <Link to="/shop" className="text-link">View all pieces <span aria-hidden="true">→</span></Link>
        </div>
        <div className="chip-row">
          {categories.map((c) => (
            <Link key={c._id} to={`/category/${c.slug}`} className="chip">
              {c.name}
            </Link>
          ))}
        </div>
      </section>

      <section className="container maker-story">
        <div className="maker-story-copy">
          <span className="section-kicker">Behind every loop</span>
          <h2>Made slowly, just for you.</h2>
          <p>From the first yarn loop to the final detail, each Cozy Loopz piece is crafted by hand and made to be treasured.</p>
        </div>
      </section>

      <section className="container home-section home-featured">
        <div className="section-heading">
          <div>
            <span className="section-kicker">Fresh from the hook</span>
            <h2>Newly made</h2>
          </div>
        </div>
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
