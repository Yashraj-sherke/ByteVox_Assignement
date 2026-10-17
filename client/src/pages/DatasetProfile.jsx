import Icon from '../components/Icon';
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';

export default function DatasetProfile() {
  const { id } = useParams();
  const [dataset, setDataset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    api.getDataset(id)
      .then(data => setDataset(data))
      .catch(err => setError(err.message || 'Failed to load dataset.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleCreateReport = async () => {
    try {
      const res = await api.createReport(dataset.id, `Report: ${dataset.originalName.replace('.csv', '')}`);
      navigate(`/report/${res.id}`);
    } catch (err) {
      alert(`Could not create report: ${err.message}`);
    }
  };

  if (loading) {
    return <div className="container"><p>Loading dataset profile...</p></div>;
  }

  if (error || !dataset) {
    return (
      <div className="container">
        <div className="card" style={{ color: '#bb6673', background: 'var(--danger-bg)' }}>
          ⚠️ {error || 'Dataset not found.'}
        </div>
        <Link to="/" className="btn btn-secondary btn-sm" style={{ marginTop: '1rem' }}>
          ← Back to Dashboard
        </Link>
      </div>
    );
  }

  const { originalName, rowCount, columns = [], errorRows = [], sampleRows = [] } = dataset;

  const getTypeBadgeClass = (type) => {
    switch (type) {
      case 'number': return 'badge-number';
      case 'date': return 'badge-date';
      case 'category': return 'badge-category';
      default: return 'badge-text';
    }
  };

  return (
    <div className="container">
      {/* Breadcrumb & Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link to="/" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          ← Back to Dashboard
        </Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 className="dataset-page-title"><span><Icon name="file" size={24}/></span>{originalName}</h1>
            <p style={{ marginTop: '0.2rem' }}>
              Dataset profile · Column types, completeness, and parsing audit
            </p>
          </div>

          <button onClick={handleCreateReport} className="btn btn-primary">
            + Create report
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Valid Rows</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#7797bd', marginTop: '0.2rem' }}>
            {rowCount}
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Detected Columns</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#9b83c4', marginTop: '0.2rem' }}>
            {columns.length}
          </div>
        </div>

        <div
          className="card"
          style={{
            padding: '1.25rem',
            textAlign: 'center',
            borderColor: errorRows.length > 0 ? 'rgba(245, 158, 11, 0.4)' : 'var(--border-color)',
            background: errorRows.length > 0 ? 'rgba(245, 158, 11, 0.05)' : 'var(--bg-card)',
          }}
        >
          <div style={{ fontSize: '0.8rem', color: errorRows.length > 0 ? '#b48d3c' : 'var(--text-secondary)' }}>
            Error / Skipped Rows
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: errorRows.length > 0 ? '#b48d3c' : '#10b981', marginTop: '0.2rem' }}>
            {errorRows.length}
          </div>
        </div>
      </div>

      {/* Column Breakdown Table */}
      <div className="card" style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Column Profiling & Inferred Types</h2>
        <p style={{ fontSize: '0.88rem', marginBottom: '1.25rem' }}>
          Our server-side heuristic inspected column patterns, sample frequencies, and numbers/dates.
        </p>

        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Column Name</th>
                <th>Inferred Type</th>
                <th>Missing Values</th>
                <th>Unique Count</th>
                <th>Sample Values</th>
              </tr>
            </thead>
            <tbody>
              {columns.map((col) => {
                const missingPct = rowCount > 0 ? Math.round((col.missingCount / (rowCount + errorRows.length)) * 100) : 0;
                return (
                  <tr key={col.name}>
                    <td style={{ fontWeight: 600 }}>{col.name}</td>
                    <td>
                      <span className={`badge ${getTypeBadgeClass(col.type)}`}>
                        {col.type}
                      </span>
                    </td>
                    <td>
                      {col.missingCount > 0 ? (
                        <span style={{ color: '#b48d3c', fontWeight: 600 }}>
                          {col.missingCount} ({missingPct}%)
                        </span>
                      ) : (
                        <span style={{ color: '#398c72' }}>0 (clean)</span>
                      )}
                    </td>
                    <td>{col.uniqueCount}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                        {(col.sampleValues || []).slice(0, 4).map((val, idx) => (
                          <span
                            key={idx}
                            style={{
                              fontSize: '0.75rem',
                              padding: '0.15rem 0.45rem',
                              background: 'var(--bg-secondary)',
                              borderRadius: 'var(--radius-sm)',
                              color: 'var(--text-secondary)',
                            }}
                          >
                            {String(val)}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Error Rows Table (Honesty in data handling) */}
      <div className="card">
        <div className="audit-heading" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <h2 style={{ fontSize: '1.25rem' }}>Data Integrity & Parsing Audit</h2>
          {errorRows.length === 0 ? (
            <span className="badge badge-success">✓ 100% Parsed Cleanly</span>
          ) : (
            <span className="badge badge-warning">⚠️ {errorRows.length} Problematic Row{errorRows.length > 1 ? 's' : ''} Flagged</span>
          )}
        </div>
        <p style={{ fontSize: '0.88rem', marginBottom: '1.25rem' }}>
          We report every single row that could not be parsed or was blank, along with the precise reason.
        </p>

        {errorRows.length === 0 ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: '#398c72', background: 'var(--success-bg)', borderRadius: 'var(--radius-md)' }}>
            ✓ No corrupt or empty rows were found in this file.
          </div>
        ) : (
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>CSV Line #</th>
                  <th>Reason Flagged</th>
                  <th>Raw Data Read</th>
                </tr>
              </thead>
              <tbody>
                {errorRows.map((err, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600, color: '#b48d3c' }}>Row {err.row}</td>
                    <td style={{ color: '#b58a52', fontWeight: 500 }}>{err.reason}</td>
                    <td>
                      <code style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {JSON.stringify(err.data)}
                      </code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
