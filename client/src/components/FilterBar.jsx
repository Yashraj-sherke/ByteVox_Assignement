import React, { useState } from 'react';

export default function FilterBar({ columns = [], filters = {}, onChange, disabled = false }) {
  const [isOpen, setIsOpen] = useState(false);

  // Identify date and category columns
  const dateColumns = columns.filter(c => c.type === 'date');
  const categoryColumns = columns.filter(c => c.type === 'category');

  const hasActiveFilters = Boolean(
    (filters.dateRange && filters.dateRange.column && (filters.dateRange.start || filters.dateRange.end)) ||
    (filters.category && filters.category.column && filters.category.values && filters.category.values.length > 0)
  );

  const handleDateColChange = (col) => {
    if (!col) {
      const next = { ...filters };
      delete next.dateRange;
      onChange(next);
      return;
    }
    onChange({
      ...filters,
      dateRange: {
        column: col,
        start: filters.dateRange?.start || '',
        end: filters.dateRange?.end || '',
      },
    });
  };

  const handleDateValChange = (field, val) => {
    onChange({
      ...filters,
      dateRange: {
        ...(filters.dateRange || {}),
        [field]: val,
      },
    });
  };

  const handleCategoryColChange = (col) => {
    if (!col) {
      const next = { ...filters };
      delete next.category;
      onChange(next);
      return;
    }
    onChange({
      ...filters,
      category: {
        column: col,
        values: [],
      },
    });
  };

  const handleCategoryValToggle = (val) => {
    const currentValues = filters.category?.values || [];
    const nextValues = currentValues.includes(val)
      ? currentValues.filter(v => v !== val)
      : [...currentValues, val];

    onChange({
      ...filters,
      category: {
        ...filters.category,
        values: nextValues,
      },
    });
  };

  const handleClear = () => {
    onChange({});
  };

  // Get sample / unique values for currently selected category column
  const activeCatCol = categoryColumns.find(c => c.name === filters.category?.column);
  const catOptions = activeCatCol ? activeCatCol.sampleValues || [] : [];

  return (
    <div
      className="card no-print"
      style={{
        padding: '1rem 1.25rem',
        marginBottom: '1.5rem',
        background: 'var(--bg-secondary)',
        border: hasActiveFilters ? '1px solid rgba(151, 123, 199, 0.4)' : '1px solid var(--border-color)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          
          <span style={{ fontWeight: 600, fontSize: '0.92rem' }}>Global Report Filters</span>
          {hasActiveFilters && (
            <span className="badge badge-number" style={{ background: 'rgba(151, 123, 199, 0.25)' }}>
              Active
            </span>
          )}
          {!hasActiveFilters && (
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              (No filters applied — all rows included)
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {hasActiveFilters && (
            <button onClick={handleClear} disabled={disabled} className="btn btn-secondary btn-sm" style={{ color: '#c5747e' }}>
              Clear All
            </button>
          )}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '0.82rem' }}
          >
            {isOpen ? 'Hide Controls ▲' : 'Configure Filters ▼'}
          </button>
        </div>
      </div>

      {isOpen && (
        <div
          style={{
            marginTop: '1.25rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border-color)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
            gap: '1.5rem',
          }}
        >
          {/* Date range filter */}
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
              📅 Date Range Filter
            </label>
            {dateColumns.length === 0 ? (
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>No date columns detected in dataset.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <select
                  value={filters.dateRange?.column || ''}
                  onChange={(e) => handleDateColChange(e.target.value)}
                  disabled={disabled}
                >
                  <option value="">-- None (No date filter) --</option>
                  {dateColumns.map(c => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>

                {filters.dateRange?.column && (
                  <div className="responsive-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>From</span>
                      <input
                        type="date"
                        value={filters.dateRange?.start || ''}
                        onChange={(e) => handleDateValChange('start', e.target.value)}
                        disabled={disabled}
                      />
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>To</span>
                      <input
                        type="date"
                        value={filters.dateRange?.end || ''}
                        onChange={(e) => handleDateValChange('end', e.target.value)}
                        disabled={disabled}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Category filter */}
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
              🏷️ Category Filter
            </label>
            {categoryColumns.length === 0 ? (
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>No category columns detected in dataset.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <select
                  value={filters.category?.column || ''}
                  onChange={(e) => handleCategoryColChange(e.target.value)}
                  disabled={disabled}
                >
                  <option value="">-- None (No category filter) --</option>
                  {categoryColumns.map(c => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>

                {filters.category?.column && catOptions.length > 0 && (
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                      Select values to include:
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', maxHeight: '120px', overflowY: 'auto' }}>
                      {catOptions.map(val => {
                        const isSelected = (filters.category?.values || []).includes(val);
                        return (
                          <button
                            key={val}
                            type="button"
                            onClick={() => handleCategoryValToggle(val)}
                            disabled={disabled}
                            style={{
                              padding: '0.25rem 0.6rem',
                              borderRadius: '999px',
                              fontSize: '0.8rem',
                              cursor: 'pointer',
                              border: isSelected ? '1px solid #9a80c5' : '1px solid var(--border-color)',
                              background: isSelected ? 'rgba(151, 123, 199, 0.3)' : '#f6f7fa',
                              color: isSelected ? '#a58bcc' : 'var(--text-secondary)',
                            }}
                          >
                            {isSelected ? '✓ ' : '+ '}{val}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
