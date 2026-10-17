import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import FilterBar from '../components/FilterBar';
import BlockRenderer from '../components/BlockRenderer';
import AddBlockModal from '../components/AddBlockModal';
import ShowWorkModal from '../components/ShowWorkModal';
import ShareModal from '../components/ShareModal';

export default function ReportBuilder() {
  const { id } = useParams();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Modals
  const [showAddBlock, setShowAddBlock] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [activeWorkModal, setActiveWorkModal] = useState(null); // { showWork, title }

  // Title inline editing
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState('');

  useEffect(() => {
    loadReport();
  }, [id]);

  const loadReport = async () => {
    try {
      setLoading(true);
      const data = await api.getReport(id);
      setReport(data);
      setTitleInput(data.title);
    } catch (err) {
      setError(err.message || 'Failed to load report.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTitle = async () => {
    if (!titleInput.trim()) return;
    setIsEditingTitle(false);
    try {
      const updated = await api.updateReport(id, { title: titleInput });
      setReport(updated);
    } catch (err) {
      alert(`Could not update title: ${err.message}`);
    }
  };

  const handleFiltersChange = async (newFilters) => {
    try {
      setSaving(true);
      const updated = await api.updateReport(id, { filters: newFilters });
      setReport(updated);
    } catch (err) {
      alert(`Could not update filters: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleAddBlock = async (newBlock) => {
    const rawBlocks = (report.blocks || []).map(b => ({
      id: b.id,
      type: b.type,
      title: b.title,
      config: b.config,
    }));

    const nextBlocks = [...rawBlocks, newBlock];

    try {
      setSaving(true);
      const updated = await api.updateReport(id, { blocks: nextBlocks });
      setReport(updated);
    } catch (err) {
      alert(`Could not add block: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleAddSuggestedBlocks = async () => {
    const numCols = (report.columns || []).filter(c => c.type === 'number');
    const catCols = (report.columns || []).filter(c => c.type === 'category');
    const dateCols = (report.columns || []).filter(c => c.type === 'date');

    const primaryNum = numCols.find(c => /total|amount|revenue|price|sales/i.test(c.name)) || numCols[0];
    const primaryCat = catCols.find(c => /region|category|department|status/i.test(c.name)) || catCols[0];
    const primaryDate = dateCols[0];

    const suggested = [];

    // 1. Text Note
    suggested.push({
      id: 'block_' + Date.now() + '_1',
      type: 'text',
      title: 'Report Overview',
      config: {
        content: `This report analyzes the dataset with server-computed aggregations. Click any number or chart button to inspect the full provenance and row-level calculations.`,
      },
    });

    // 2. Main KPI Metric
    if (primaryNum) {
      suggested.push({
        id: 'block_' + Date.now() + '_2',
        type: 'metric',
        title: `Total ${primaryNum.name}`,
        config: {
          column: primaryNum.name,
          aggregation: 'sum',
        },
      });
    }

    // 3. Row count metric
    suggested.push({
      id: 'block_' + Date.now() + '_3',
      type: 'metric',
      title: 'Total Transactions',
      config: {
        column: report.columns[0]?.name || 'id',
        aggregation: 'count',
      },
    });

    // 4. Metric Split by Category
    if (primaryNum && primaryCat) {
      suggested.push({
        id: 'block_' + Date.now() + '_4',
        type: 'metric',
        title: `${primaryNum.name} by ${primaryCat.name}`,
        config: {
          column: primaryNum.name,
          aggregation: 'sum',
          groupBy: primaryCat.name,
        },
      });
    }

    // 5. Chart Block (Bar)
    if (primaryNum && primaryCat) {
      suggested.push({
        id: 'block_' + Date.now() + '_5',
        type: 'chart',
        title: `${primaryNum.name} Breakdown by ${primaryCat.name}`,
        config: {
          chartType: 'bar',
          xColumn: primaryCat.name,
          yColumn: primaryNum.name,
          aggregation: 'sum',
        },
      });
    }

    // 6. Top Rows Table
    if (primaryNum) {
      suggested.push({
        id: 'block_' + Date.now() + '_6',
        type: 'table',
        title: `Top 5 High-Value Records by ${primaryNum.name}`,
        config: {
          sortColumn: primaryNum.name,
          sortDirection: 'desc',
          limit: 5,
        },
      });
    }

    const currentBlocks = (report.blocks || []).map(b => ({
      id: b.id,
      type: b.type,
      title: b.title,
      config: b.config,
    }));

    try {
      setSaving(true);
      const updated = await api.updateReport(id, { blocks: [...currentBlocks, ...suggested] });
      setReport(updated);
    } catch (err) {
      alert(`Could not add suggested blocks: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBlock = async (blockId) => {
    const rawBlocks = (report.blocks || [])
      .filter(b => b.id !== blockId)
      .map(b => ({
        id: b.id,
        type: b.type,
        title: b.title,
        config: b.config,
      }));

    try {
      setSaving(true);
      const updated = await api.updateReport(id, { blocks: rawBlocks });
      setReport(updated);
    } catch (err) {
      alert(`Could not delete block: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleMoveBlock = async (fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= report.blocks.length) return;

    const rawBlocks = (report.blocks || []).map(b => ({
      id: b.id,
      type: b.type,
      title: b.title,
      config: b.config,
    }));

    const [moved] = rawBlocks.splice(fromIndex, 1);
    rawBlocks.splice(toIndex, 0, moved);

    try {
      setSaving(true);
      const updated = await api.updateReport(id, { blocks: rawBlocks });
      setReport(updated);
    } catch (err) {
      alert(`Could not reorder blocks: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="container"><p>Loading report...</p></div>;
  }

  if (error || !report) {
    return (
      <div className="container">
        <div className="card" style={{ color: '#bb6673', background: 'var(--danger-bg)' }}>
          ⚠️ {error || 'Report not found.'}
        </div>
        <Link to="/" className="btn btn-secondary btn-sm" style={{ marginTop: '1rem' }}>
          ← All reports
        </Link>
      </div>
    );
  }

  return (
    <div className="container report-editor">
      {/* Top action bar */}
      <div className="no-print editor-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <Link to="/" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            ← All reports
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem' }}>
            {isEditingTitle ? (
              <div className="report-title-row" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="text"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  style={{ fontSize: '1.5rem', fontWeight: 700, padding: '0.2rem 0.5rem' }}
                  autoFocus
                />
                <button onClick={handleSaveTitle} className="btn btn-primary btn-sm">Save</button>
                <button onClick={() => setIsEditingTitle(false)} className="btn btn-secondary btn-sm">Cancel</button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h1 style={{ cursor: 'pointer' }} onClick={() => setIsEditingTitle(true)} title="Click to rename">
                  {report.title}
                </h1>
                <button onClick={() => setIsEditingTitle(true)} className="btn-icon" style={{ fontSize: '0.85rem' }} title="Rename">
                  Rename
                </button>
              </div>
            )}
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Source: <strong>{report.datasetName}</strong> ({report.rowCount} rows)
          </p>
        </div>

        {/* Action Buttons */}
        <div className="report-actions" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>

          <button
            onClick={() => setShowShare(true)}
            className="btn btn-secondary btn-sm"
          >
            Share link
          </button>

          <button
            onClick={() => setShowAddBlock(true)}
            className="btn btn-primary btn-sm"
          >
            + Add Block
          </button>
        </div>
      </div>

      <div className="report-meta-strip"><span className="report-meta-label">REPORT DETAILS</span><span><strong>{report.blocks.length}</strong> blocks</span><span><strong>{report.rowCount.toLocaleString()}</strong> source rows</span><span className="report-meta-engine"><span className="status-dot"/> Server-computed results</span></div>
      {/* Global Filter Bar */}
      <FilterBar
        columns={report.columns || []}
        filters={report.filters || {}}
        onChange={handleFiltersChange}
        disabled={saving}
      />

      {/* Saving indicator */}
      {saving && (
        <div style={{ fontSize: '0.8rem', color: '#8771b5', marginBottom: '1rem', textAlign: 'right' }}>
          Recalculating blocks server-side...
        </div>
      )}

      {/* Block List */}
      {(report.blocks || []).length === 0 ? (
        <div
          className="card"
          style={{
            textAlign: 'center',
            padding: '3.5rem 1.5rem',
            border: '2px dashed var(--border-color)',
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🧱</div>
          <h3>This report has no blocks yet</h3>
          <p style={{ maxWidth: '460px', margin: '0.5rem auto 1.5rem', fontSize: '0.9rem' }}>
            Add metrics, bar or line charts, sorted tables, and contextual notes. Or let us auto-generate suggested blocks based on your columns!
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <button onClick={() => setShowAddBlock(true)} className="btn btn-primary">
              + Add Custom Block
            </button>
            <button onClick={handleAddSuggestedBlocks} className="btn btn-secondary">
              ✨ Auto-Generate Suggested Blocks
            </button>
          </div>
        </div>
      ) : (
        <div className="report-block-grid">
          {report.blocks.map((block, idx) => (
            <BlockRenderer
              key={block.id}
              block={block}
              index={idx}
              totalBlocks={report.blocks.length}
              onMoveUp={() => handleMoveBlock(idx, idx - 1)}
              onMoveDown={() => handleMoveBlock(idx, idx + 1)}
              onDelete={handleDeleteBlock}
              onShowWork={(showWork, title) => setActiveWorkModal({ showWork, title })}
            />
          ))}
        </div>
      )}

      {/* Add Block Modal */}
      <AddBlockModal
        isOpen={showAddBlock}
        onClose={() => setShowAddBlock(false)}
        columns={report.columns || []}
        onAddBlock={handleAddBlock}
        onAddSuggestedBlocks={handleAddSuggestedBlocks}
      />

      {/* Show Work Modal */}
      {activeWorkModal && (
        <ShowWorkModal
          isOpen={Boolean(activeWorkModal)}
          onClose={() => setActiveWorkModal(null)}
          showWork={activeWorkModal.showWork}
          title={activeWorkModal.title}
        />
      )}

      {/* Share Modal */}
      {showShare && (
        <ShareModal
          isOpen={showShare}
          onClose={() => setShowShare(false)}
          reportId={report.id}
          reportTitle={report.title}
        />
      )}
    </div>
  );
}
