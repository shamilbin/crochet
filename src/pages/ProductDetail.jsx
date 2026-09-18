import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, finalPrice } from '../api.js';

const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || '919645213232';

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [activeImg, setActiveImg] = useState(0);
  const [qty, setQty] = useState(1);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setProduct(null);
    setActiveImg(0);
    setQty(1);
    api.getProduct(id).then(setProduct).catch(() => setNotFound(true));
  }, [id]);

  useEffect(() => {
    if (!product) return;
    const desc = product.description?.slice(0, 155) || 'Handmade crochet, made to order.';
    document.title = `${product.name} — Cozy Loopz`;

    const setMeta = (attr, key, value) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute('content', value);
    };

    setMeta('name', 'description', desc);
    setMeta('property', 'og:title', `${product.name} — Cozy Loopz`);
    setMeta('property', 'og:description', desc);
    if (product.images?.[0]) setMeta('property', 'og:image', product.images[0]);
  }, [product]);

  if (notFound) {
    return (
      <div className="container empty-state">
        Couldn't find that piece. <Link to="/shop">Back to shop</Link>
      </div>
    );
  }
  if (!product) return <div className="container empty-state">Loading...</div>;

  const price = finalPrice(product.price, product.discountPercentage);
  const hasDiscount = product.discountPercentage > 0;
  const pageUrl = typeof window !== 'undefined' ? window.location.href : '';

  const message = `Hi! I'd like to order:\n${product.name} (x${qty}) - ₹${price * qty}\n${pageUrl}`;
  const waLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

  return (
    <section className="container product-detail">
      <div>
        <div className="carousel-main">
          <img src={product.images[activeImg]} alt={product.name} />
        </div>
        {product.images.length > 1 && (
          <div className="carousel-thumbs">
            {product.images.map((img, i) => (
              <button
                key={i}
                className={`carousel-thumb ${i === activeImg ? 'active' : ''}`}
                onClick={() => setActiveImg(i)}
                aria-label={`View image ${i + 1}`}
              >
                <img src={img} alt="" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        {product.category && <div className="pd-category">{product.category.name}</div>}
        <h1 className="pd-name">{product.name}</h1>

        <div className="pd-price-row">
          <span className="pd-price-final">₹{price}</span>
          {hasDiscount && <span className="pd-price-original">₹{product.price}</span>}
          {hasDiscount && <span className="discount-badge">{product.discountPercentage}% off</span>}
        </div>

        {!product.inStock && <span className="soldout-badge">Sold out</span>}

        {product.description && <p className="pd-desc">{product.description}</p>}

        {product.timeToMake && (
          <div className="pd-meta">
            <div><strong>Time to make</strong>{product.timeToMake}</div>
          </div>
        )}

        {product.inStock && (
          <>
            <div className="qty-row">
              <span style={{ fontSize: 14, color: 'var(--ink-soft)' }}>Quantity</span>
              <div className="qty-control">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity">−</button>
                <span>{qty}</span>
                <button onClick={() => setQty((q) => q + 1)} aria-label="Increase quantity">+</button>
              </div>
            </div>

            <a href={waLink} target="_blank" rel="noreferrer" className="btn btn-whatsapp">
              Buy on WhatsApp — ₹{price * qty}
            </a>
          </>
        )}
      </div>
    </section>
  );
}
