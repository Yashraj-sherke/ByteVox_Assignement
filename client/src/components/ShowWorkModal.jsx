import useDialog from '../hooks/useDialog';
import React from 'react';

export default function ShowWorkModal({ isOpen, onClose, showWork, title }) {
  const dialogRef = useDialog(isOpen, onClose);
  if (!isOpen || !showWork) return null;

  const {
    description,
    operation,
    totalRows = 0,
    rowsIncluded = 0,
    rowsExcluded = 0,
    exclusionReasons = [],
  } = showWork;

  const includedPct = totalRows > 0 ? Math.round((rowsIncluded / totalRows) * 100) : 100;
  const excludedPct = totalRows > 0 ? Math.round((rowsExcluded / totalRows) * 100) : 0;

  const accounted = rowsIncluded + rowsExcluded === totalRows && exclusionReasons.reduce((sum, item) => sum + item.count, 0) === rowsExcluded;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content ShowWorkModal" ref={dialogRef} role="dialog" aria-modal="true" aria-label="How was this calculated?" tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '640px' }}
      >
        <div className="modal-header">
          <div>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              How was this calculated?
            </h3>
            {title && <p style={{ fontSize: '0.82rem', marginTop: '0.2rem' }}>Block: {title}</p>}
          </div>
          <button
            onClick={onClose}
            className="btn-icon"
            style={{ fontSize: '1.2rem', cursor: 'pointer' }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className={`audit-receipt ${accounted ? '' : 'audit-receipt-warning'}`}>
            <span className="eyebrow">CALCULATION RECEIPT</span>
            <strong>{accounted ? 'Every row is accounted for' : 'Row accounting needs review'}</strong>
            <p>{rowsIncluded.toLocaleString()} included + {rowsExcluded.toLocaleString()} excluded = {totalRows.toLocaleString()} parsed rows</p>
            <small>Computed on the server. Exclusions below explain which rows did not contribute. File parsing issues are listed separately in the dataset profile.</small>
          </div>
          {/* Plain English explanation */}
          <div>
            <label style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Plain English Explanation
            </label>
            <p style={{ marginTop: '0.35rem', color: 'var(--text-primary)', fontSize: '0.95rem', lineHeight: '1.5' }}>
              {description || 'Computed over active rows in dataset.'}
            </p>
          </div>

          {/* Exact operation / query */}
          <div>
            <label style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Operation summary (server-side array computation)
            </label>
            <div
              style={{
                marginTop: '0.35rem',
                padding: '0.75rem 1rem',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                fontFamily: 'Consolas, Monaco, monospace',
                fontSize: '0.85rem',
                color: '#7797bd',
                wordBreak: 'break-all',
              }}
            >
              <code>{operation}</code>
            </div>
          </div>

          {/* Row Inclusion Breakdown */}
          <div>
            <label style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Row Accounting & Provenance
            </label>
            
            <div className="responsive-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
              <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Total Rows</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, marginTop: '0.2rem' }}>{totalRows}</div>
              </div>
              <div style={{ background: 'var(--success-bg)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(16, 185, 129, 0.25)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: '#398c72' }}>Included ({includedPct}%)</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#398c72', marginTop: '0.2rem' }}>{rowsIncluded}</div>
              </div>
              <div style={{ background: rowsExcluded > 0 ? 'var(--warning-bg)' : '#f8f9fc', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: rowsExcluded > 0 ? '1px solid rgba(245, 158, 11, 0.25)' : '1px solid var(--border-color)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: rowsExcluded > 0 ? '#b48d3c' : 'var(--text-secondary)' }}>Excluded ({excludedPct}%)</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: rowsExcluded > 0 ? '#b48d3c' : 'var(--text-secondary)', marginTop: '0.2rem' }}>{rowsExcluded}</div>
              </div>
            </div>

            {/* Visual ratio bar */}
            <div style={{ marginTop: '0.75rem', height: '6px', background: '#eff0f5', borderRadius: '999px', overflow: 'hidden', display: 'flex' }}>
              <div style={{ width: `${includedPct}%`, background: '#10b981', transition: 'width 0.3s ease' }} />
              <div style={{ width: `${excludedPct}%`, background: '#f59e0b', transition: 'width 0.3s ease' }} />
            </div>
          </div>

          {/* Exclusion reasons breakdown (if any) */}
          {exclusionReasons.length > 0 && (
            <div>
              <label style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Detailed Exclusion Reasons
              </label>
              <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {exclusionReasons.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.5rem 0.75rem',
                      background: 'rgba(245, 158, 11, 0.08)',
                      border: '1px solid rgba(245, 158, 11, 0.2)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.85rem',
                    }}
                  >
                    <span style={{ color: '#b58a52' }}>⚠️ {item.reason}</span>
                    <span className="badge badge-warning">{item.count} row{item.count > 1 ? 's' : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-secondary btn-sm">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
