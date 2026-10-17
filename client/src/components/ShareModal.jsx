import useDialog from '../hooks/useDialog';
import React, { useState, useEffect } from 'react';
import { api } from '../api/client';

export default function ShareModal({ isOpen, onClose, reportId, reportTitle }) {
  const dialogRef = useDialog(isOpen, onClose);
  const [links, setLinks] = useState([]);
  const [expiresInHours, setExpiresInHours] = useState('24');
  const [createdUrl, setCreatedUrl] = useState(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && reportId) {
      loadLinks();
    }
  }, [isOpen, reportId]);

  const loadLinks = async () => {
    try {
      const data = await api.listShareLinks(reportId);
      setLinks(data);
    } catch (err) {
      console.error('Failed to load share links:', err);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setCopied(false);

    try {
      const hours = expiresInHours === 'never' ? null : parseInt(expiresInHours, 10);
      const data = await api.createShareLink(reportId, hours);
      const fullUrl = `${window.location.origin}/shared/${data.token}`;
      setCreatedUrl(fullUrl);
      await loadLinks();
    } catch (err) {
      setError(err.message || 'Failed to create share link.');
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (token) => {
    try {
      await api.revokeShareLink(token);
      await loadLinks();
    } catch (err) {
      alert(`Could not revoke link: ${err.message}`);
    }
  };

  const handleCopy = async (urlToCopy) => {
    try {
      await navigator.clipboard.writeText(urlToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setError('Could not copy automatically. Select and copy the link manually.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content ShareModal" ref={dialogRef} role="dialog" aria-modal="true" aria-label="Share report" tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '600px' }}
      >
        <div className="modal-header">
          <div>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Share report
            </h3>
            <p style={{ fontSize: '0.82rem', marginTop: '0.2rem' }}>{reportTitle}</p>
          </div>
          <button onClick={onClose} aria-label="Close dialog" className="btn-icon" style={{ fontSize: '1.2rem', cursor: 'pointer' }}>
            ✕
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {error && (
            <div style={{ background: 'var(--danger-bg)', color: '#bb6673', padding: '0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
              {error}
            </div>
          )}

          {/* Create new link */}
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label>Set Link Expiration</label>
              <select
                value={expiresInHours}
                onChange={(e) => setExpiresInHours(e.target.value)}
              >
                <option value="1">1 hour</option>
                <option value="24">24 hours (Recommended)</option>
                <option value="168">7 days</option>
                <option value="720">30 days</option>
                <option value="never">Never expires</option>
              </select>
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
              {loading ? 'Creating Link...' : '✨ Generate Share Link'}
            </button>
          </form>

          {/* Newly created link callout */}
          {createdUrl && (
            <div
              style={{
                background: 'rgba(151, 123, 199, 0.12)',
                border: '1px solid rgba(151, 123, 199, 0.35)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
              }}
            >
              <div style={{ fontSize: '0.8rem', color: '#a58bcc', fontWeight: 600, marginBottom: '0.4rem' }}>
                Shareable Read-Only Link (No Sign-in Required):
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="text"
                  readOnly
                  value={createdUrl}
                  style={{ background: 'rgba(0,0,0,0.5)', fontSize: '0.85rem' }}
                />
                <button
                  onClick={() => handleCopy(createdUrl)}
                  className="btn btn-primary btn-sm"
                  style={{ minWidth: '80px' }}
                >
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>
          )}

          {/* Existing links */}
          <div>
            <h4 style={{ fontSize: '0.95rem', marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>
              Active & Revoked Share Links ({links.length})
            </h4>

            {links.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                No share links generated yet for this report.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '220px', overflowY: 'auto' }}>
                {links.map((link) => {
                  const isExpired = link.expires_at && new Date() > new Date(link.expires_at);
                  const isRevoked = Boolean(link.revoked);
                  const shareUrl = `${window.location.origin}/shared/${link.token}`;

                  return (
                    <div
                      className="share-link-row"
                      key={link.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.65rem 0.85rem',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.82rem',
                      }}
                    >
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '280px' }}>
                        <div style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                          /shared/{link.token.slice(0, 8)}...
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {link.expires_at
                            ? `Expires: ${new Date(link.expires_at).toLocaleString()}`
                            : 'No expiration'}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {isRevoked ? (
                          <span className="badge badge-danger">Revoked</span>
                        ) : isExpired ? (
                          <span className="badge badge-warning">Expired</span>
                        ) : (
                          <>
                            <span className="badge badge-success">Active</span>
                            <button
                              onClick={() => handleCopy(shareUrl)}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                            >
                              Copy
                            </button>
                            <button
                              onClick={() => handleRevoke(link.token)}
                              className="btn btn-danger btn-sm"
                              style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                            >
                              Revoke
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
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
