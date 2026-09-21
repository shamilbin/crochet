import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, finalPrice } from '../api.js';

const MAX_IMAGES = 4;
// Kept below Vercel's request-body limit after JSON encoding.
const MAX_TOTAL_IMAGE_BYTES = 3 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 1600;

const emptyProduct = {
  name: '',
  description: '',
  images: [],
  price: '',
  discountPercentage: '0',
  category: '',
  inStock: true,
  timeToMake: '',
  timeToMakeUnit: 'days',
};

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read this image.'));
    reader.readAsDataURL(blob);
  });
}

function compressImage(file) {
  if (!file.type.startsWith('image/')) {
    return Promise.reject(new Error(`${file.name} is not an image.`));
  }

  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = async () => {
      URL.revokeObjectURL(objectUrl);
      const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);

      const context = canvas.getContext('2d');
      if (!context) return reject(new Error(`Could not prepare ${file.name}.`));
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(async (blob) => {
        if (!blob) return reject(new Error(`Could not prepare ${file.name}.`));
        try {
          resolve(await blobToDataUrl(blob));
        } catch (err) {
          reject(err);
        }
      }, 'image/jpeg', 0.84);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Could not open ${file.name}. Please choose a JPG, PNG, WebP, or GIF image.`));
    };

    image.src = objectUrl;
  });
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [editing, setEditing] = useState(null); // null = not editing, {} = new, {...} = existing
  const [form, setForm] = useState(emptyProduct);
  const [formError, setFormError] = useState('');
  const [toast, setToast] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);
  const [dataError, setDataError] = useState('');
  const [uploadingImages, setUploadingImages] = useState(false);

  useEffect(() => {
    api.me().then(() => setChecking(false)).catch(() => navigate('/admin/login'));
  }, [navigate]);

  useEffect(() => {
    if (!checking) refreshAll();
  }, [checking]);

  async function refreshAll() {
    const [productsResult, categoriesResult] = await Promise.allSettled([
      api.getProducts({ sort: 'newest' }),
      api.getCategories(),
    ]);
    const errors = [];

    if (productsResult.status === 'fulfilled') setProducts(productsResult.value);
    else errors.push(productsResult.reason?.message || 'Could not load products.');

    if (categoriesResult.status === 'fulfilled') setCategories(categoriesResult.value);
    else errors.push(categoriesResult.reason?.message || 'Could not load categories.');

    setDataError([...new Set(errors)].join(' '));
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }

  async function handleLogout() {
    await api.logout();
    navigate('/admin/login');
  }

  function startNew() {
    setForm({ ...emptyProduct, category: categories[0]?._id || '' });
    setEditing({});
    setFormError('');
  }

  function startEdit(p) {
    setForm({
      name: p.name,
      description: p.description || '',
      images: p.images || [],
      price: String(p.price),
      discountPercentage: String(p.discountPercentage || 0),
      category: p.category?._id || p.category || '',
      inStock: p.inStock,
      timeToMake: p.timeToMake || '',
      timeToMakeUnit: p.timeToMakeUnit || 'days',
    });
    setEditing(p);
    setFormError('');
  }

  async function handleSave(e) {
    e.preventDefault();
    setFormError('');
    const images = form.images.map((s) => s.trim()).filter(Boolean);
    if (images.length === 0) return setFormError('Add at least one product image.');
    if (!form.category) return setFormError('Choose a category.');

    const body = {
      name: form.name.trim(),
      description: form.description.trim(),
      images,
      price: Number(form.price),
      discountPercentage: Number(form.discountPercentage) || 0,
      category: form.category,
      inStock: form.inStock,
      timeToMake: form.timeToMake.trim(),
      timeToMakeUnit: form.timeToMake.trim() ? form.timeToMakeUnit : '',
    };

    try {
      if (editing && editing._id) {
        await api.updateProduct(editing._id, body);
        showToast('Product updated');
      } else {
        await api.createProduct(body);
        showToast('Product added');
      }
      setEditing(null);
      refreshAll();
    } catch (err) {
      setFormError(err.message);
    }
  }

  async function handleImageSelect(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;

    const availableSlots = MAX_IMAGES - form.images.length;
    if (files.length > availableSlots) {
      setFormError(`You can add up to ${MAX_IMAGES} images per product. Remove an image before adding more.`);
      return;
    }

    setFormError('');
    setUploadingImages(true);
    try {
      const images = await Promise.all(files.map(compressImage));
      const nextImages = [...form.images, ...images];
      const totalSize = nextImages.reduce((total, image) => total + image.length, 0);
      if (totalSize > MAX_TOTAL_IMAGE_BYTES) {
        throw new Error('These images are still too large after compression. Choose smaller images or fewer images.');
      }
      setForm((current) => ({ ...current, images: [...current.images, ...images] }));
    } catch (err) {
      setFormError(err.message);
    } finally {
      setUploadingImages(false);
    }
  }

  function removeImage(index) {
    setForm((current) => ({ ...current, images: current.images.filter((_, i) => i !== index) }));
  }

  async function toggleStock(p) {
    await api.updateProduct(p._id, { inStock: !p.inStock });
    refreshAll();
  }

  async function handleDelete(p) {
    if (!confirm(`Delete "${p.name}"? This can't be undone.`)) return;
    await api.deleteProduct(p._id);
    showToast('Product deleted');
    refreshAll();
  }

  async function handleAddCategory(e) {
    e.preventDefault();
    const name = newCategory.trim().replace(/\s+/g, ' ');
    if (!name) {
      setCategoryError('Enter a category name.');
      return;
    }

    setCategoryError('');
    setSavingCategory(true);
    try {
      // The API creates the slug so category names work consistently on every device.
      await api.createCategory({ name });
      setNewCategory('');
      await refreshAll();
      showToast('Category added');
    } catch (err) {
      setCategoryError(err.message || 'Could not add the category.');
    } finally {
      setSavingCategory(false);
    }
  }

  async function handleDeleteCategory(c) {
    if (!confirm(`Delete category "${c.name}"?`)) return;
    try {
      await api.deleteCategory(c._id);
      refreshAll();
    } catch (err) {
      showToast(err.message);
    }
  }

  if (checking) return null;

  return (
    <div className="admin-shell">
      <div className="admin-topbar">
        <strong className="admin-brand">
          Cozy Loopz Admin
        </strong>
        <button className="btn btn-outline" onClick={handleLogout}>Log out</button>
      </div>

      <div className="admin-container">
        <div className="admin-tabs">
          <button className={`admin-tab ${tab === 'products' ? 'active' : ''}`} onClick={() => { setTab('products'); setEditing(null); }}>
            Products
          </button>
          <button className={`admin-tab ${tab === 'categories' ? 'active' : ''}`} onClick={() => { setTab('categories'); setEditing(null); }}>
            Categories
          </button>
        </div>

        {dataError && <div className="admin-data-error" role="alert">{dataError}</div>}

        {tab === 'products' && !editing && (
          <div className="admin-panel">
            <div className="admin-panel-heading">
              <h3>All products ({products.length})</h3>
              <button className="btn btn-primary" onClick={startNew}>+ Add product</button>
            </div>

            <div className="admin-table-scroll">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th></th><th>Name</th><th>Category</th><th>Price</th><th>Discount</th><th>Status</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p._id}>
                      <td className="product-thumbnail"><img src={p.images[0]} alt="" /></td>
                      <td data-label="Name">{p.name}</td>
                      <td data-label="Category">{p.category?.name || '—'}</td>
                      <td data-label="Price">₹{finalPrice(p.price, p.discountPercentage)}</td>
                      <td data-label="Discount">{p.discountPercentage || 0}%</td>
                      <td data-label="Status">
                        <label className="toggle">
                          <input type="checkbox" checked={p.inStock} onChange={() => toggleStock(p)} />
                          {p.inStock ? 'In stock' : 'Sold out'}
                        </label>
                      </td>
                      <td data-label="Actions">
                        <div className="row-actions">
                          <button onClick={() => startEdit(p)}>Edit</button>
                          <button className="danger" onClick={() => handleDelete(p)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {products.length === 0 && (
                    <tr><td className="admin-table-empty" colSpan={7}>No products yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'products' && editing && (
          <div className="admin-panel">
            <h3 style={{ marginBottom: 18 }}>{editing._id ? 'Edit product' : 'Add product'}</h3>
            <form onSubmit={handleSave}>
              <div className="field">
                <label>Name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>

              <div className="field">
                <label>Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>

              <div className="field">
                <label htmlFor="product-images">Product images (up to 4)</label>
                <input
                  id="product-images"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  onChange={handleImageSelect}
                  disabled={uploadingImages || form.images.length >= MAX_IMAGES}
                />
                <div className="field-hint">
                  {uploadingImages
                    ? 'Preparing images…'
                    : 'Choose images from your device. They are resized before being saved.'}
                </div>

                {form.images.length > 0 && (
                  <div className="image-preview-grid">
                    {form.images.map((image, index) => (
                      <div className="image-preview" key={`${image.slice(0, 40)}-${index}`}>
                        <img src={image} alt={`Product preview ${index + 1}`} />
                        <button type="button" onClick={() => removeImage(index)} aria-label={`Remove image ${index + 1}`}>
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="field-row">
                <div className="field">
                  <label>Price (₹)</label>
                  <input type="number" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
                </div>
                <div className="field">
                  <label>Discount (%)</label>
                  <input type="number" min="0" max="100" value={form.discountPercentage} onChange={(e) => setForm({ ...form, discountPercentage: e.target.value })} />
                </div>
              </div>

              <div className="field-row">
                <div className="field">
                  <label>Category</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required>
                    <option value="">Select...</option>
                    {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                  {categories.length === 0 && (
                    <div className="field-hint">
                      {dataError
                        ? 'Categories could not load. Resolve the database connection message above and try again.'
                        : 'Add a category from the Categories tab before saving this product.'}
                    </div>
                  )}
                </div>
                <div className="field">
                  <label>Time to make</label>
                  <div className="time-to-make-control">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      inputMode="numeric"
                      placeholder="e.g. 3"
                      value={form.timeToMake}
                      onChange={(e) => setForm({ ...form, timeToMake: e.target.value })}
                    />
                    <select
                      aria-label="Time to make unit"
                      value={form.timeToMakeUnit}
                      onChange={(e) => setForm({ ...form, timeToMakeUnit: e.target.value })}
                    >
                      <option value="days">Days</option>
                      <option value="hours">Hours</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="field">
                <label className="toggle">
                  <input type="checkbox" checked={form.inStock} onChange={(e) => setForm({ ...form, inStock: e.target.checked })} />
                  In stock
                </label>
              </div>

              {formError && <div className="field-error">{formError}</div>}

              <div className="form-actions">
                <button className="btn btn-primary" type="submit" disabled={uploadingImages}>
                  {uploadingImages ? 'Preparing images…' : 'Save product'}
                </button>
                <button className="btn btn-outline" type="button" onClick={() => setEditing(null)}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        {tab === 'categories' && (
          <div className="admin-panel">
            <h3 style={{ marginBottom: 18 }}>Categories</h3>
            <form className="category-form" onSubmit={handleAddCategory}>
              <label className="sr-only" htmlFor="new-category">New category name</label>
              <input
                id="new-category"
                placeholder="New category name"
                value={newCategory}
                onChange={(e) => {
                  setNewCategory(e.target.value);
                  if (categoryError) setCategoryError('');
                }}
                maxLength={60}
                disabled={savingCategory}
                required
              />
              <button className="btn btn-primary" type="submit" disabled={savingCategory}>
                {savingCategory ? 'Adding…' : 'Add category'}
              </button>
            </form>

            {categoryError && <div className="field-error category-error" role="alert">{categoryError}</div>}

            <div className="admin-table-scroll">
              <table className="admin-table">
                <thead><tr><th>Name</th><th>Slug</th><th></th></tr></thead>
                <tbody>
                  {categories.map((c) => (
                    <tr key={c._id}>
                      <td data-label="Name">{c.name}</td>
                      <td data-label="Slug">{c.slug}</td>
                      <td data-label="Actions"><button type="button" className="danger" onClick={() => handleDeleteCategory(c)}>Delete</button></td>
                    </tr>
                  ))}
                  {categories.length === 0 && (
                    <tr><td className="admin-table-empty" colSpan={3}>No categories yet. Add one above before creating a product.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
