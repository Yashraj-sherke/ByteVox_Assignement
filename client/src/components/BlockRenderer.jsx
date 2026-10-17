import React from 'react';
import Icon from './Icon';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

export default function BlockRenderer({
  block,
  index,
  totalBlocks,
  onMoveUp,
  onMoveDown,
  onDelete,
  onShowWork,
  readOnly = false,
}) {
  const { type, title, result } = block;
  const blockClass = `card report-block report-block-${type}`;

  const renderHeader = (customBadge) => (
    <div className="block-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <h3>{title || 'Untitled Block'}</h3>
        {customBadge}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        {/* Signature Show Work button */}
        {result?.showWork && (
          <button
            onClick={() => onShowWork(result.showWork, title)}
            className="show-work-trigger"
            title="Click to see calculation, query and row provenance"
          >
             <Icon name="link" size={12}/> How was this calculated?
          </button>
        )}

        {/* Builder controls */}
        {!readOnly && (
          <div className="no-print block-controls" style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', marginLeft: '0.4rem' }}>
            <button
              onClick={() => onMoveUp(index)}
              disabled={index === 0}
              className="btn-icon"
              title="Move Up" aria-label="Move block up"
              style={{ fontSize: '0.85rem' }}
            >
              ▲
            </button>
            <button
              onClick={() => onMoveDown(index)}
              disabled={index === totalBlocks - 1}
              className="btn-icon"
              title="Move Down" aria-label="Move block down"
              style={{ fontSize: '0.85rem' }}
            >
              ▼
            </button>
            <button
              onClick={() => onDelete(block.id)}
              className="btn-icon"
              title="Remove Block" aria-label="Remove block"
              style={{ color: '#c5747e', fontSize: '0.95rem' }}
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
  );

  if (result?.error) {
    return (
      <div className={blockClass} style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}>
        {renderHeader(<span className="badge badge-danger">Error</span>)}
        <div style={{ color: '#bb6673', fontSize: '0.9rem', padding: '1rem', background: 'var(--danger-bg)', borderRadius: 'var(--radius-md)' }}>
          ⚠️ Could not compute this block: {result.error}
        </div>
      </div>
    );
  }

  // 1. METRIC BLOCK
  if (type === 'metric') {
    const hasGroups = Array.isArray(result?.groups) && result.groups.length > 0;

    return (
      <div className={blockClass}>
        {renderHeader(<span className="badge badge-number">{block.config?.aggregation?.toUpperCase()}</span>)}

        {!hasGroups ? (
          <div className="metric-value-row">
            <button
              className="number-clickable metric-value"
              onClick={() => onShowWork(result?.showWork, title)}
              title="Click number to view calculation proof"
              style={{
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {result?.value !== null && result?.value !== undefined
                ? Number(result.value).toLocaleString(undefined, { maximumFractionDigits: 2 })
                : '—'}
            </button>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              ({block.config?.column || 'records'})
            </span>
          </div>
        ) : (
          <div className="grouped-metrics">
            {result.groups.map((g, idx) => (
              <div
                key={idx}
                className="grouped-metric-row"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.6rem 0.85rem',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <span className="group-label">{g.group}</span>
                <span className="group-meter" aria-hidden="true"><i style={{width:`${Math.min(100, Math.abs(g.value || 0) / result.groups.reduce((max,item)=>Math.max(max,Math.abs(item.value || 0)),1) * 100)}%`}}/></span>
                <button
                  className="number-clickable group-value"
                  onClick={() => onShowWork(result?.showWork, `${title} (${g.group})`)}
                  style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--accent-primary)' }}
                >
                  {g.value !== null ? Number(g.value).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}
                </button>
              </div>
            ))}
          </div>
        )}
        {result?.showWork && <div className="metric-caption"><span className="status-dot"/>{result.showWork.rowsIncluded.toLocaleString()} rows included<span>/</span>{result.showWork.rowsExcluded.toLocaleString()} excluded</div>}
      </div>
    );
  }

  // 2. CHART BLOCK
  if (type === 'chart') {
    const chartData = result?.chartData || [];
    const isLine = block.config?.chartType === 'line';

    return (
      <div className={blockClass}>
        {renderHeader(
          <span className="badge badge-category">
            {isLine ? 'Line Chart' : 'Bar Chart'}
          </span>
        )}

        {chartData.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No data available with the current filter settings.
          </div>
        ) : (
          <div style={{ width: '100%', height: 300, marginTop: '1rem' }}>
            <ResponsiveContainer width="100%" height="100%">
              {isLine ? (
                <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 4" stroke="var(--border-color)" vertical={false} />
                  <XAxis dataKey="label" stroke="var(--text-secondary)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-secondary)" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                    }}
                  />
                  <Line type="monotone" dataKey="value" stroke="var(--chart-primary)" strokeWidth={3} dot={{ fill: 'var(--chart-primary)', r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              ) : (
                <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 4" stroke="var(--border-color)" vertical={false} />
                  <XAxis dataKey="label" stroke="var(--text-secondary)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-secondary)" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                    }}
                  />
                  <Bar dataKey="value" name={block.config?.yColumn || "Value"} fill="var(--chart-primary)" radius={[5, 5, 0, 0]} maxBarSize={64} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </div>
    );
  }

  // 3. TABLE BLOCK
  if (type === 'table') {
    const rows = result?.rows || [];
    const cols = rows.length > 0 ? Object.keys(rows[0]) : [];

    return (
      <div className={blockClass}>
        {renderHeader(<span className="badge badge-text">Table</span>)}

        {rows.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No rows match the specified criteria or filters.
          </div>
        ) : (
          <div className="table-responsive" style={{ maxHeight: '350px' }}>
            <table>
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>#</th>
                  {cols.map(c => (
                    <th key={c}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={idx}>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{idx + 1}</td>
                    {cols.map(c => (
                      <td key={c}>
                        {row[c] !== null && row[c] !== undefined ? String(row[c]) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // 4. TEXT BLOCK
  if (type === 'text') {
    return (
      <div className={blockClass} >
        {renderHeader(<span className="badge badge-text">Note</span>)}
        <div style={{ color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: '1.6', fontSize: '0.95rem' }}>
          {result?.content || block.config?.content || ''}
        </div>
      </div>
    );
  }

  return null;
}
