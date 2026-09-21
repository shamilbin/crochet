export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div>
          <strong>Cozy Loopz</strong>
          <p style={{ marginTop: 6, maxWidth: 320 }}>
            Handmade crochet gifts, bags, keychains and bouquets — made to order, one stitch at a time.
          </p>
        </div>
        <div className="footer-links">
          <a
            className="footer-instagram"
            href="https://www.instagram.com/cozy.loops_._?stkn=MXR3MjZ4YnJuMmRhMA=="
            target="_blank"
            rel="noopener noreferrer"
          >
            Check out our Instagram page <span aria-hidden="true">↗</span>
          </a>
          <p>© {new Date().getFullYear()} Cozy Loopz.</p>
        </div>
      </div>
    </footer>
  );
}
