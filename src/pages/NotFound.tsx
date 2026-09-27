import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <section className="section page">
      <div className="container container-narrow">
        <div className="card empty-card">
          <h1>Page not found</h1>
          <p>That page doesn’t exist or has moved.</p>
          <Link to="/" className="btn btn-primary">
            Back to home
          </Link>
        </div>
      </div>
    </section>
  );
}
