import React from 'react';
export default function Icon({ name = 'chart', size = 20, ...props }) {
  const paths = {
    chart: <><path d="M4 4v16h16"/><path d="M8 15v-4m5 4V7m5 8v-6"/></>,
    upload: <><path d="M12 16V4m-4 4 4-4 4 4"/><path d="M4 15v5h16v-5"/></>,
    file: <><path d="M14 3H5v18h14V8z"/><path d="M14 3v5h5M8 12h8m-8 4h6"/></>,
    trash: <><path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7"/></>,
    link: <><path d="m10 13 4-4m-6 6-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 3 1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0" transform="translate(1 1)"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name] || paths.chart}</svg>;
}
