import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, finalPrice } from '../api.js';
import ProductCard from '../components/ProductCard.jsx';

function formatTimeToMake(product) {
  const value = String(product.timeToMake || '').trim();
  if (!value) return '';
  if (!product.timeToMakeUnit) return value;

  const singularUnit = product.timeToMakeUnit === 'hours' ? 'hour' : 'day';
  return `${value} ${Number(value) === 1 ? singularUnit : `${singularUnit}s`}`;
}

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [activeImg, setActiveImg] = useState(0);
  const [qty, setQty] = useState(1);
  const [notFound, setNotFound] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [recommendations, setRecommendations] = useState([]);

  useEffect(() => {
    setProduct(null);
    setActiveImg(0);
    setQty(1);
    setNotFound(false);
    setRecommendations([]);
    api.getProduct(id).then(setProduct).catch(() => setNotFound(true));
  }, [id]);

  useEffect(() => {
    api.getSiteConfig()
      .then(({ whatsappNumber: number }) => setWhatsappNumber(number || ''))
      .catch(() => setWhatsappNumber(''));
  }, []);

  useEffect(() => {
    if (!product) return undefined;

    let cancelled = false;
    const categoryId = product.category?._id || product.category;
    api.getProducts({ sort: 'newest' })
      .then((items) => {
        if (cancelled) return;

        const otherItems = items.filter((item) => item._id !== product._id);
        const sameCategory = otherItems.filter((item) => (item.category?._id || item.category) === categoryId);
        const otherRecommendations = otherItems.filter((item) => (item.category?._id || item.category) !== categoryId);
        setRecommendations([...sameCategory, ...otherRecommendations].slice(0, 4));
      })
      .catch(() => {
        if (!cancelled) setRecommendations([]);
      });

    return () => { cancelled = true; };
  }, [product]);

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
  const timeToMake = formatTimeToMake(product);

  const message = `Hi! I'd like to order:\n${product.name} (x${qty}) - ₹${price * qty}\n${pageUrl}`;
  const waLink = whatsappNumber ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}` : '';

  return (
    <>
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

        <div className="product-info">
        {product.category && <div className="pd-category">{product.category.name}</div>}
        <h1 className="pd-name">{product.name}</h1>

        <div className="pd-price-row">
          <span className="pd-price-final">₹{price}</span>
          {hasDiscount && <span className="pd-price-original">₹{product.price}</span>}
          {hasDiscount && <span className="discount-badge">{product.discountPercentage}% off</span>}
        </div>

        {!product.inStock && <span className="soldout-badge">Sold out</span>}

        {product.description && <p className="pd-desc">{product.description}</p>}

        {timeToMake && (
          <div className="pd-meta">
            <div><strong>Time to make</strong>{timeToMake}</div>
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

            {waLink ? (
              <a href={waLink} target="_blank" rel="noreferrer" className="btn btn-whatsapp">
                Buy  — ₹{price * qty}
              </a>
            ) : (
              <p className="whatsapp-unavailable">WhatsApp ordering is being configured.</p>
            )}
          </>
        )}
        </div>
      </section>

      {recommendations.length > 0 && (
        <section className="container product-recommendations">
          <div className="section-heading">
            <div>
              <span className="section-kicker">More to love</span>
              <h2>You may also like</h2>
            </div>
            <Link to="/shop" className="text-link">View all pieces <span aria-hidden="true">→</span></Link>
          </div>
          <div className="product-grid">
            {recommendations.map((item) => <ProductCard key={item._id} product={item} />)}
          </div>
        </section>
      )}
    </>
  );
}
