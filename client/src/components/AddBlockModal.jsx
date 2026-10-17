import useDialog from '../hooks/useDialog';
import React, { useState } from 'react';

export default function AddBlockModal({ isOpen, onClose, columns = [], onAddBlock, onAddSuggestedBlocks }) {
  const dialogRef = useDialog(isOpen, onClose);
  const [activeTab, setActiveTab] = useState('metric'); // 'metric', 'chart', 'table', 'text'

  // Metric State
  const [metricTitle, setMetricTitle] = useState('');
  const [metricColumn, setMetricColumn] = useState('');
  const [metricAggregation, setMetricAggregation] = useState('sum');
  const [metricGroupBy, setMetricGroupBy] = useState('');

  // Chart State
  const [chartTitle, setChartTitle] = useState('');
  const [chartType, setChartType] = useState('bar'); // 'bar' | 'line'
  const [chartXCol, setChartXCol] = useState('');
  const [chartYCol, setChartYCol] = useState('');
  const [chartAgg, setChartAgg] = useState('sum');

  // Table State
  const [tableTitle, setTableTitle] = useState('');
  const [tableSortCol, setTableSortCol] = useState('');
  const [tableSortDir, setTableSortDir] = useState('desc');
  const [tableLimit, setTableLimit] = useState(10);

  // Text State
  const [textTitle, setTextTitle] = useState('');
  const [textContent, setTextContent] = useState('');

  if (!isOpen) return null;

  const numberCols = columns.filter(c => c.type === 'number');
  const categoryCols = columns.filter(c => c.type === 'category' || c.type === 'text');
  const allCols = columns;

  const handleAdd = (e) => {
    e.preventDefault();

    let newBlock = null;
    const blockId = 'block_' + Date.now();

    if (activeTab === 'metric') {
      const col = metricAggregation === 'count' ? (metricColumn || columns[0]?.name) : metricColumn || numberCols[0]?.name;
      newBlock = {
        id: blockId,
        type: 'metric',
        title: metricTitle || `${metricAggregation.toUpperCase()} of ${col}`,
        config: {
          column: col,
          aggregation: metricAggregation,
          groupBy: metricGroupBy || undefined,
        },
      };
    } else if (activeTab === 'chart') {
      const xCol = chartXCol || categoryCols[0]?.name || columns[0]?.name;
      const yCol = chartYCol || numberCols[0]?.name || columns[0]?.name;
      newBlock = {
        id: blockId,
        type: 'chart',
        title: chartTitle || `${chartAgg.toUpperCase()}(${yCol}) by ${xCol}`,
        config: {
          chartType,
          xColumn: xCol,
          yColumn: yCol,
          aggregation: chartAgg,
        },
      };
    } else if (activeTab === 'table') {
      const sortCol = tableSortCol || numberCols[0]?.name || columns[0]?.name;
      newBlock = {
        id: blockId,
        type: 'table',
        title: tableTitle || `Top ${tableLimit} Rows by ${sortCol}`,
        config: {
          sortColumn: sortCol,
          sortDirection: tableSortDir,
          limit: parseInt(tableLimit, 10) || 10,
        },
      };
    } else if (activeTab === 'text') {
      newBlock = {
        id: blockId,
        type: 'text',
        title: textTitle || 'Note',
        config: {
          content: textContent || 'Enter your executive summary or context notes here.',
        },
      };
    }

    if (newBlock) {
      onAddBlock(newBlock);
      onClose();
    }
  };

  const handleSuggested = () => {
    if (onAddSuggestedBlocks) {
      onAddSuggestedBlocks();
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content AddBlockModal" ref={dialogRef} role="dialog" aria-modal="true" aria-label="Add report block" tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '640px' }}
      >
        <div className="modal-header">
          <div>
            <h3>Add Report Block</h3>
            <p style={{ fontSize: '0.82rem', marginTop: '0.2rem' }}>Choose a visualization, metric, or note</p>
          </div>
          <button onClick={onClose} aria-label="Close dialog" className="btn-icon" style={{ fontSize: '1.2rem', cursor: 'pointer' }}>
            ✕
          </button>
        </div>

        {/* Tab selection */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--border-color)',
            background: 'var(--bg-secondary)',
          }}
        >
          {[
            { id: 'metric', label: 'Metric', desc: 'KPI card' },
            { id: 'chart', label: 'Chart', desc: 'Bar or Line' },
            { id: 'table', label: 'Table', desc: 'Top rows' },
            { id: 'text', label: 'Note', desc: 'Context/Text' },
          ].map(tab => (
            <button
              key={tab.id}
              aria-pressed={activeTab === tab.id}
              className="block-type-option"
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                padding: '0.85rem 0.5rem',
                background: activeTab === tab.id ? 'rgba(151, 123, 199, 0.15)' : 'transparent',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid #9b83c4' : '2px solid transparent',
                color: activeTab === tab.id ? '#a58bcc' : 'var(--text-secondary)',
                fontWeight: activeTab === tab.id ? 600 : 500,
                fontSize: '0.88rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}<small>{tab.desc}</small>
            </button>
          ))}
        </div>

        <form onSubmit={handleAdd} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          {/* METRIC TAB */}
          {activeTab === 'metric' && (
            <>
              <div className="input-group">
                <label>Card Title (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Total Revenue, Average Order"
                  value={metricTitle}
                  onChange={(e) => setMetricTitle(e.target.value)}
                />
              </div>

              <div className="responsive-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group">
                  <label>Aggregation Operation</label>
                  <select
                    value={metricAggregation}
                    onChange={(e) => setMetricAggregation(e.target.value)}
                  >
                    <option value="sum">SUM</option>
                    <option value="average">AVERAGE</option>
                    <option value="count">COUNT (Rows)</option>
                    <option value="min">MIN</option>
                    <option value="max">MAX</option>
                  </select>
                </div>

                <div className="input-group">
                  <label>Target Column {metricAggregation !== 'count' && '(Numbers)'}</label>
                  <select
                    value={metricColumn}
                    onChange={(e) => setMetricColumn(e.target.value)}
                    required={metricAggregation !== 'count'}
                  >
                    <option value="">-- Select Column --</option>
                    {(metricAggregation === 'count' ? allCols : numberCols).map(c => (
                      <option key={c.name} value={c.name}>
                        {c.name} ({c.type})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="input-group">
                <label>Split by Category (Optional Grouping)</label>
                <select
                  value={metricGroupBy}
                  onChange={(e) => setMetricGroupBy(e.target.value)}
                >
                  <option value="">-- No Split (Single Metric) --</option>
                  {categoryCols.map(c => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* CHART TAB */}
          {activeTab === 'chart' && (
            <>
              <div className="input-group">
                <label>Chart Title (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Sales by Region, Revenue Over Time"
                  value={chartTitle}
                  onChange={(e) => setChartTitle(e.target.value)}
                />
              </div>

              <div className="responsive-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group">
                  <label>Chart Type</label>
                  <select value={chartType} onChange={(e) => setChartType(e.target.value)}>
                    <option value="bar">📊 Bar Chart</option>
                    <option value="line">📈 Line Chart</option>
                  </select>
                </div>

                <div className="input-group">
                  <label>Aggregation Function</label>
                  <select value={chartAgg} onChange={(e) => setChartAgg(e.target.value)}>
                    <option value="sum">SUM</option>
                    <option value="average">AVERAGE</option>
                    <option value="min">MIN</option>
                    <option value="max">MAX</option>
                    <option value="count">COUNT</option>
                  </select>
                </div>
              </div>

              <div className="responsive-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group">
                  <label>X-Axis (Category or Date)</label>
                  <select
                    value={chartXCol}
                    onChange={(e) => setChartXCol(e.target.value)}
                    required
                  >
                    <option value="">-- Select X-Axis --</option>
                    {allCols.map(c => (
                      <option key={c.name} value={c.name}>{c.name} ({c.type})</option>
                    ))}
                  </select>
                </div>

                <div className="input-group">
                  <label>Y-Axis (Numeric Values)</label>
                  <select
                    value={chartYCol}
                    onChange={(e) => setChartYCol(e.target.value)}
                    required
                  >
                    <option value="">-- Select Y-Axis --</option>
                    {numberCols.map(c => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          {/* TABLE TAB */}
          {activeTab === 'table' && (
            <>
              <div className="input-group">
                <label>Table Title (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Top 10 Orders by Value"
                  value={tableTitle}
                  onChange={(e) => setTableTitle(e.target.value)}
                />
              </div>

              <div className="responsive-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div className="input-group">
                  <label>Sort by Column</label>
                  <select
                    value={tableSortCol}
                    onChange={(e) => setTableSortCol(e.target.value)}
                    required
                  >
                    <option value="">-- Select Column --</option>
                    {numberCols.map(c => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="input-group">
                  <label>Direction</label>
                  <select
                    value={tableSortDir}
                    onChange={(e) => setTableSortDir(e.target.value)}
                  >
                    <option value="desc">Highest First (DESC)</option>
                    <option value="asc">Lowest First (ASC)</option>
                  </select>
                </div>

                <div className="input-group">
                  <label>Row Limit</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={tableLimit}
                    onChange={(e) => setTableLimit(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          {/* TEXT TAB */}
          {activeTab === 'text' && (
            <>
              <div className="input-group">
                <label>Section Title (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Executive Summary, Findings"
                  value={textTitle}
                  onChange={(e) => setTextTitle(e.target.value)}
                />
              </div>

              <div className="input-group">
                <label>Note Content</label>
                <textarea
                  rows="4"
                  placeholder="Add context, assumptions, observations, or next steps..."
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  required
                />
              </div>
            </>
          )}

          <div className="block-form-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={handleSuggested}
              className="btn btn-secondary btn-sm"
              style={{ color: '#c084fc', borderColor: 'rgba(192, 132, 252, 0.3)' }}
            >
              ✨ Auto-Generate Suggested Blocks
            </button>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="button" onClick={onClose} className="btn btn-secondary btn-sm">
                Cancel
              </button>
              <button type="submit" className="btn btn-primary btn-sm">
                + Add Block
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
