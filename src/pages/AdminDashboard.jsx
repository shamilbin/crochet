import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, finalPrice } from '../api.js';

const emptyProduct = {
  name: '',
  description: '',
  images: ['', '', '', ''],
  price: '',
  discountPercentage: '0',
  category: '',
  inStock: true,
  timeToMake: '',
};

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

  useEffect(() => {
    api.me().then(() => setChecking(false)).catch(() => navigate('/admin/login'));
  }, [navigate]);

  useEffect(() => {
    if (!checking) refreshAll();
  }, [checking]);

  function refreshAll() {
    api.getProducts({ sort: 'newest' }).then(setProducts).catch(() => {});
    api.getCategories().then(setCategories).catch(() => {});
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
      images: [0, 1, 2, 3].map((i) => p.images[i] || ''),
      price: String(p.price),
      discountPercentage: String(p.discountPercentage || 0),
      category: p.category?._id || p.category || '',
      inStock: p.inStock,
      timeToMake: p.timeToMake || '',
    });
    setEditing(p);
    setFormError('');
  }

  async function handleSave(e) {
    e.preventDefault();
    setFormError('');
    const images = form.images.map((s) => s.trim()).filter(Boolean);
    if (images.length === 0) return setFormError('Add at least one image link.');
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
    if (!newCategory.trim()) return;
    const slug = newCategory.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    try {
      await api.createCategory({ name: newCategory.trim(), slug });
      setNewCategory('');
      refreshAll();
    } catch (err) {
      showToast(err.message);
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
        <strong style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--berry)' }}>
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

        {tab === 'products' && !editing && (
          <div className="admin-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
              <h3>All products ({products.length})</h3>
              <button className="btn btn-primary" onClick={startNew}>+ Add product</button>
            </div>

            <table className="admin-table">
              <thead>
                <tr>
                  <th></th><th>Name</th><th>Category</th><th>Price</th><th>Discount</th><th>Status</th><th></th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p._id}>
                    <td><img src={p.images[0]} alt="" /></td>
                    <td>{p.name}</td>
                    <td>{p.category?.name || '—'}</td>
                    <td>₹{finalPrice(p.price, p.discountPercentage)}</td>
                    <td>{p.discountPercentage || 0}%</td>
                    <td>
                      <label className="toggle">
                        <input type="checkbox" checked={p.inStock} onChange={() => toggleStock(p)} />
                        {p.inStock ? 'In stock' : 'Sold out'}
                      </label>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button onClick={() => startEdit(p)}>Edit</button>
                        <button className="danger" onClick={() => handleDelete(p)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {products.length === 0 && (
                  <tr><td colSpan={7} style={{ color: 'var(--ink-soft)', padding: '20px 10px' }}>No products yet.</td></tr>
                )}
              </tbody>
            </table>
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
                <label>Image links (up to 4 — Google Drive direct-view links)</label>
                {form.images.map((img, i) => (
                  <input
                    key={i}
                    style={{ marginBottom: 8 }}
                    placeholder={`Image ${i + 1} URL`}
                    value={img}
                    onChange={(e) => {
                      const next = [...form.images];
                      next[i] = e.target.value;
                      setForm({ ...form, images: next });
                    }}
                  />
                ))}
                <div className="field-hint">
                  Google Drive share links need converting: use
                  https://drive.google.com/uc?export=view&amp;id=FILE_ID
                </div>
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
                </div>
                <div className="field">
                  <label>Time to make</label>
                  <input placeholder="e.g. 3-5 days" value={form.timeToMake} onChange={(e) => setForm({ ...form, timeToMake: e.target.value })} />
                </div>
              </div>

              <div className="field">
                <label className="toggle">
                  <input type="checkbox" checked={form.inStock} onChange={(e) => setForm({ ...form, inStock: e.target.checked })} />
                  In stock
                </label>
              </div>

              {formError && <div className="field-error">{formError}</div>}

              <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                <button className="btn btn-primary" type="submit">Save product</button>
                <button className="btn btn-outline" type="button" onClick={() => setEditing(null)}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        {tab === 'categories' && (
          <div className="admin-panel">
            <h3 style={{ marginBottom: 18 }}>Categories</h3>
            <form onSubmit={handleAddCategory} style={{ display: 'flex', gap: 10, marginBottom: 22 }}>
              <input
                style={{ flex: 1, padding: '11px 14px', borderRadius: 10, border: '1.5px solid var(--line)' }}
                placeholder="New category name"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
              />
              <button className="btn btn-primary" type="submit">Add</button>
            </form>

            <table className="admin-table">
              <thead><tr><th>Name</th><th>Slug</th><th></th></tr></thead>
              <tbody>
                {categories.map((c) => (
                  <tr key={c._id}>
                    <td>{c.name}</td>
                    <td>{c.slug}</td>
                    <td><button className="danger" onClick={() => handleDeleteCategory(c)}>Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
