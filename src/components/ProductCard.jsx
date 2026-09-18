import { Link } from 'react-router-dom';
import { finalPrice } from '../api.js';

export default function ProductCard({ product }) {
  const hasDiscount = product.discountPercentage > 0;
  const price = finalPrice(product.price, product.discountPercentage);

  return (
    <Link to={`/product/${product._id}`} className="product-card">
      <img className="product-card-img" src={product.images?.[0]} alt={product.name} loading="lazy" />
      <div className="product-card-body">
        <div className="product-card-name">{product.name}</div>
        <div className="price-row">
          <span className="price-final">₹{price}</span>
          {hasDiscount && <span className="price-original">₹{product.price}</span>}
        </div>
        {!product.inStock ? (
          <span className="soldout-badge">Sold out</span>
        ) : hasDiscount ? (
          <span className="discount-badge">{product.discountPercentage}% off</span>
        ) : null}
      </div>
    </Link>
  );
}
