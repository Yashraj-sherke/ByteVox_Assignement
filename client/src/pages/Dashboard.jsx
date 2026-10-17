import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import ShareModal from '../components/ShareModal';
import Icon from '../components/Icon';

export default function Dashboard() {
  const [datasets, setDatasets] = useState([]);
  const [reports, setReports] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(null);

  // New Report Modal
  const [showNewReportModal, setShowNewReportModal] = useState(false);
  const [selectedDatasetId, setSelectedDatasetId] = useState('');
  const [reportTitle, setReportTitle] = useState('');
  const [creatingReport, setCreatingReport] = useState(false);

  // Share Modal
  const [shareReport, setShareReport] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [dList, rList] = await Promise.all([
        api.listDatasets(),
        api.listReports(),
      ]);
      setDatasets(dList);
      setReports(rList);
      if (dList.length > 0 && !selectedDatasetId) {
        setSelectedDatasetId(dList[0].id);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file) => {
    if (!file || uploading) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setUploadError('Only CSV files are accepted (.csv).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File is too large. Maximum size is 10 MB.');
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.uploadDataset(formData);
      setUploadSuccess(`Successfully uploaded and parsed "${res.originalName}" (${res.rowCount} rows, ${res.columns.length} columns)!`);
      await loadData();
      // Navigate to dataset profile immediately to review column profiling
      navigate(`/dataset/${res.id}`);
    } catch (err) {
      setUploadError(err.message || 'Failed to upload or parse CSV file.');
    } finally {
      setUploading(false);
    }
  };

  const handleCreateReport = async (e) => {
    e.preventDefault();
    if (!selectedDatasetId) return;

    setCreatingReport(true);
    try {
      const res = await api.createReport(selectedDatasetId, reportTitle || 'New Sales Report');
      navigate(`/report/${res.id}`);
    } catch (err) {
      alert(`Could not create report: ${err.message}`);
    } finally {
      setCreatingReport(false);
    }
  };

  const handleDeleteReport = async (reportId) => {
    if (!window.confirm('Are you sure you want to delete this report? Any active share links will also be revoked.')) {
      return;
    }
    try {
      await api.deleteReport(reportId);
      await loadData();
    } catch (err) {
      alert(`Could not delete report: ${err.message}`);
    }
  };

  const handleDeleteDataset = async (datasetId) => {
    if (!window.confirm('Deleting this dataset will also permanently delete all associated reports. Continue?')) {
      return;
    }
    try {
      await api.deleteDataset(datasetId);
      await loadData();
    } catch (err) {
      alert(`Could not delete dataset: ${err.message}`);
    }
  };

  return (
    <div className="container dashboard">
      <div className="page-heading">
        <div><span className="eyebrow">YOUR WORKSPACE</span><h1>Overview</h1><p>Your reports and source data, in one place.</p></div>
        <button onClick={() => { if (datasets.length) setShowNewReportModal(true); else document.getElementById('csv-upload').click(); }} className="btn btn-primary">+ Create report</button>
      </div>

      <div className="workspace-summary"><span><strong>{reports.length}</strong> reports</span><span><strong>{datasets.length}</strong> data sources</span><span><strong>{datasets.reduce((total,d) => total + d.row_count, 0).toLocaleString()}</strong> source rows</span></div>
      <div className="product-workspace">
        <section id="reports" className="report-library">
          <div className="library-toolbar"><div><h2>Reports <span className="count">{reports.length}</span></h2><p>Manage and share your analysis.</p></div><input type="search" aria-label="Search reports" placeholder="Search reports…" value={query} onChange={e=>setQuery(e.target.value)}/></div>
          <div className="library-columns" aria-hidden="true"><span>REPORT NAME</span><span>LAST UPDATED</span><span>ACTIONS</span></div>
          {loading ? <div className="empty-state">Loading reports…</div> : !reports.length ? <div className="empty-state"><Icon size={26}/><h3>Create your first report</h3><p>Import a CSV, then choose the metrics you want to explore.</p></div> : reports.filter(r=>`${r.title} ${r.dataset_name}`.toLowerCase().includes(query.toLowerCase())).map(report=>(
            <article className="library-row" key={report.id}>
              <span className="library-icon"><Icon size={20}/></span><div className="library-name"><Link to={`/report/${report.id}`}>{report.title}</Link><p><Icon name="file" size={12}/>{report.dataset_name}</p></div>
              <time dateTime={report.updated_at}>{new Date(report.updated_at).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}</time>
              <div className="library-actions"><button onClick={()=>setShareReport(report)} className="btn-icon" title="Share report" aria-label={`Share ${report.title}`}><Icon name="link" size={16}/></button><button onClick={()=>handleDeleteReport(report.id)} className="btn-icon delete-action" aria-label={`Delete report ${report.title}`}><Icon name="trash" size={16}/></button><Link to={`/report/${report.id}`} className="btn btn-secondary btn-sm">Open <span>→</span></Link></div>
            </article>
          ))}
          {!loading && reports.length>0 && !reports.some(r=>`${r.title} ${r.dataset_name}`.toLowerCase().includes(query.toLowerCase())) && <div className="empty-state">No reports match “{query}”.</div>}
          <div className="library-footnote"><Icon name="link" size={14}/><span>Select any metric in a report to inspect its calculation and source rows.</span></div>
        </section>
        <aside className="data-rail">
          <section className={`upload-zone ${uploading ? 'is-uploading' : ''}`} aria-busy={uploading}
            onDragOver={e=>{e.preventDefault();e.currentTarget.classList.add('drag-active');}}
            onDragLeave={e=>{e.preventDefault();e.currentTarget.classList.remove('drag-active');}}
            onDrop={e=>{e.preventDefault();e.currentTarget.classList.remove('drag-active');handleFileUpload(e.dataTransfer.files?.[0]);}}>
            <span className="upload-icon"><Icon name="upload" size={22}/></span><div className="upload-copy"><h3>Import your data</h3><p>Drop a CSV file here to get started.</p><span>Up to 10 MB · Column profiling included</span></div>
            <label className="btn btn-secondary upload-button">{uploading ? 'Processing…' : 'Choose CSV file'}<input id="csv-upload" type="file" accept=".csv" className="file-input" disabled={uploading} onChange={e=>{handleFileUpload(e.target.files?.[0]);e.target.value='';}}/></label>
            {uploadError && <p className="upload-message error-message" role="alert">{uploadError}</p>}{uploadSuccess && <p className="upload-message" role="status">{uploadSuccess}</p>}
          </section>
          <section id="datasets" className="rail-sources"><div className="section-heading"><h2>Data sources <span className="count">{datasets.length}</span></h2></div>
            {loading ? <p>Loading sources…</p> : !datasets.length ? <p>Your imported datasets will appear here.</p> : datasets.map(dataset=>(<article className="rail-source" key={dataset.id}><span className="source-file-icon"><Icon name="file" size={18}/></span><div><Link to={`/dataset/${dataset.id}`}>{dataset.original_name}</Link><p>{dataset.row_count.toLocaleString()} rows · {dataset.columns_meta?.length || 0} columns</p><Link className="source-profile" to={`/dataset/${dataset.id}`}>View profile →</Link></div><button onClick={()=>handleDeleteDataset(dataset.id)} className="btn-icon delete-action" aria-label={`Delete dataset ${dataset.original_name}`}><Icon name="trash" size={14}/></button></article>))}
          </section>
        </aside>
      </div>
      {/* New Report Modal */}
      {showNewReportModal && (
        <div className="modal-overlay" onClick={() => setShowNewReportModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3>Create New Report</h3>
              <button onClick={() => setShowNewReportModal(false)} className="btn-icon">✕</button>
            </div>
            <form onSubmit={handleCreateReport} className="modal-body">
              <div className="input-group">
                <label>Report Title</label>
                <input
                  type="text"
                  placeholder="e.g. Q1 Sales Performance"
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <label>Source Dataset</label>
                <select
                  value={selectedDatasetId}
                  onChange={(e) => setSelectedDatasetId(e.target.value)}
                  required
                >
                  {datasets.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.original_name} ({d.row_count} rows)
                    </option>
                  ))}
                </select>
              </div>

              <div className="modal-footer" style={{ padding: '1rem 0 0', background: 'transparent' }}>
                <button type="button" onClick={() => setShowNewReportModal(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button type="submit" disabled={creatingReport} className="btn btn-primary btn-sm">
                  {creatingReport ? 'Creating...' : 'Create & Open Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {shareReport && (
        <ShareModal
          isOpen={Boolean(shareReport)}
          onClose={() => setShareReport(null)}
          reportId={shareReport.id}
          reportTitle={shareReport.title}
        />
      )}
    </div>
  );
}
