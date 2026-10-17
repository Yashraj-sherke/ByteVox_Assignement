import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import BlockRenderer from '../components/BlockRenderer';
import ShowWorkModal from '../components/ShowWorkModal';

export default function SharedReport() {
  const { token } = useParams();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeWorkModal, setActiveWorkModal] = useState(null);

  useEffect(() => {
    api.getSharedReport(token)
      .then(data => setReport(data))
      .catch(err => setError(err.message || 'This share link is invalid, expired, or revoked.'))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
        <p>Loading shared report...</p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="container" style={{ maxWidth: '540px', marginTop: '4rem' }}>
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem', borderColor: 'rgba(239, 68, 68, 0.4)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
          <h2 style={{ marginBottom: '0.75rem', color: '#bb6673' }}>Cannot Access Report</h2>
          <p style={{ marginBottom: '1.5rem', fontSize: '0.92rem' }}>
            {error || 'This link may have expired or been revoked by the author.'}
          </p>
          <Link to="/login" className="btn btn-secondary btn-sm">
            Sign In to ReportCraft
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Read-only notification badge */}
      <div
        className="no-print"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem 1.25rem',
          background: 'rgba(151, 123, 199, 0.1)',
          border: '1px solid rgba(151, 123, 199, 0.25)',
          borderRadius: 'var(--radius-md)',
          marginBottom: '2rem',
          fontSize: '0.85rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>👁️</span>
          <span>
            <strong>Shared View</strong> — You are viewing this report in read-only mode. Every number shows its work.
          </span>
        </div>
      </div>

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.2rem' }}>{report.title}</h1>
        <p style={{ marginTop: '0.35rem', color: 'var(--text-muted)' }}>
          Source Dataset: <strong>{report.datasetName}</strong> ({report.rowCount} rows audited)
        </p>
      </div>

      {/* Blocks List */}
      {(report.blocks || []).length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          This report contains no blocks.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {report.blocks.map((block, idx) => (
            <BlockRenderer
              key={block.id || idx}
              block={block}
              index={idx}
              totalBlocks={report.blocks.length}
              readOnly={true}
              onShowWork={(showWork, title) => setActiveWorkModal({ showWork, title })}
            />
          ))}
        </div>
      )}

      {/* Show Work Modal for shared viewer */}
      {activeWorkModal && (
        <ShowWorkModal
          isOpen={Boolean(activeWorkModal)}
          onClose={() => setActiveWorkModal(null)}
          showWork={activeWorkModal.showWork}
          title={activeWorkModal.title}
        />
      )}
    </div>
  );
}
