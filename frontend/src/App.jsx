import { useEffect, useMemo, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000';
const VARIABLES = [
  ['temperature', 'Temperature anomaly'],
  ['rainfall', 'Annual rainfall'],
  ['sea_level', 'Sea level'],
  ['ndvi', 'Vegetation index (NDVI)']
];

export default function App() {
  const [variable, setVariable] = useState('temperature');
  const [region, setRegion] = useState('All');
  const [start, setStart] = useState(2000);
  const [end, setEnd] = useState(2024);
  const [options, setOptions] = useState(null);
  const [data, setData] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [regions, setRegions] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/options`)
      .then(r => { if (!r.ok) throw new Error('Could not load project data.'); return r.json(); })
      .then(o => { setOptions(o); setStart(o.min_year); setEnd(o.max_year); })
      .catch(() => setError('Backend not connected. Start the Flask server on port 5000.'));
  }, []);

  async function runAnalysis() {
    if (Number(start) > Number(end)) {
      setError('Start year must be earlier than or equal to end year.');
      return;
    }
    setLoading(true); setError('');
    const q = `variable=${variable}&region=${encodeURIComponent(region)}&start_year=${start}&end_year=${end}`;
    try {
      const [d, a, r] = await Promise.all([
        fetch(`${API}/api/data?${q}`).then(x => x.json()),
        fetch(`${API}/api/analysis?${q}`).then(async x => { const j = await x.json(); if (!x.ok) throw new Error(j.error); return j; }),
        fetch(`${API}/api/regions?variable=${variable}&start_year=${start}&end_year=${end}`).then(x => x.json())
      ]);
      if (d.error) throw new Error(d.error);
      setData(d.records || []); setAnalysis(a); setRegions(r || []);
    } catch (e) {
      setError(e.message || 'Unable to analyze data.');
    } finally { setLoading(false); }
  }

  useEffect(() => { if (options) runAnalysis(); }, [options]);

  const selectedLabel = useMemo(() => VARIABLES.find(v => v[0] === variable)?.[1] || variable, [variable]);
  const unit = analysis?.unit || '';
  const csv = useMemo(() => {
    const rows = [['Year', selectedLabel], ...data.map(x => [x.year, x.value])];
    return rows.map(r => r.join(',')).join('\\n');
  }, [data, selectedLabel]);

  function downloadCSV() {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'earthtrend-analysis.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand"><div className="brand-icon">🌍</div><div><strong>EarthTrend</strong><small>EARTH SYSTEM TREND DETECTIVE</small></div></div>
      <span className="live-pill"><i /> Sample dataset</span>
    </header>

    <main className="container">
      <section className="hero">
        <div><p className="eyebrow">ENVIRONMENTAL DATA EXPLORER</p>
          <h1>Understand how our<br/><span>planet is changing.</span></h1>
          <p className="hero-copy">Explore Earth science variables, compare regional patterns and detect statistically meaningful trends over time.</p>
        </div>
        <div className="hero-orb">🌎</div>
      </section>

      {error && <div className="error">{error}</div>}

      <section className="panel filters">
        <div className="section-heading"><div><p className="eyebrow">01 / EXPLORE</p><h2>Choose your data</h2></div><span className="muted">Set filters and run the analysis</span></div>
        <div className="filter-grid">
          <label>Earth science variable<select value={variable} onChange={e => setVariable(e.target.value)}>{VARIABLES.map(v => <option key={v[0]} value={v[0]}>{v[1]}</option>)}</select></label>
          <label>Geographical region<select value={region} onChange={e => setRegion(e.target.value)}><option>All</option>{options?.regions?.map(r => <option key={r}>{r}</option>)}</select></label>
          <label>Start year<input type="number" min={options?.min_year || 1900} max={end} value={start} onChange={e => setStart(e.target.value)}/></label>
          <label>End year<input type="number" min={start} max={options?.max_year || 2100} value={end} onChange={e => setEnd(e.target.value)}/></label>
        </div>
        <button className="primary-btn" onClick={runAnalysis} disabled={loading}>{loading ? 'Analyzing…' : 'Run trend analysis →'}</button>
      </section>

      <section className="section-heading results-heading"><div><p className="eyebrow">02 / RESULTS</p><h2>Trend analysis</h2></div><span className="muted">{region} · {start}–{end}</span></section>

      {analysis && <>
        <section className="metrics">
          <article className="metric-card"><span>Trend direction</span><strong className={analysis.direction.toLowerCase()}>{analysis.direction}</strong><small>{selectedLabel}</small></article>
          <article className="metric-card"><span>Rate of change</span><strong>{analysis.slope_per_year > 0 ? '+' : ''}{analysis.slope_per_year}</strong><small>{unit} per year</small></article>
          <article className="metric-card"><span>P-value</span><strong>{analysis.p_value}</strong><small>Statistical test result</small></article>
          <article className="metric-card"><span>Significance</span><strong className={analysis.significant ? 'increasing' : 'stable'}>{analysis.significant ? 'Significant' : 'Not significant'}</strong><small>At α = 0.05</small></article>
        </section>

        <section className="panel chart-panel">
          <div className="section-heading"><div><p className="eyebrow">03 / VISUALIZE</p><h2>{selectedLabel} over time</h2></div><button className="secondary-btn" onClick={downloadCSV}>↓ Export CSV</button></div>
          <div className="chart-wrap">
            {data.length ? <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{top: 10,right: 20,left: 0,bottom: 5}}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7edf0"/>
                <XAxis dataKey="year" tick={{fill:'#71818b',fontSize:12}}/>
                <YAxis tick={{fill:'#71818b',fontSize:12}}/>
                <Tooltip contentStyle={{borderRadius:12,border:'1px solid #e4ebed'}}/>
                <Line type="monotone" dataKey="value" name={selectedLabel} stroke="#159b82" strokeWidth={3} dot={{r:3,fill:'#159b82'}} activeDot={{r:6}}/>
              </LineChart>
            </ResponsiveContainer> : <div className="empty">No data for this selection.</div>}
          </div>
          <p className="chart-note">Annual regional averages from the included demonstration dataset.</p>
        </section>

        <section className="two-col">
          <article className="panel interpretation">
            <p className="eyebrow">04 / SCIENTIFIC INTERPRETATION</p><h2>What is changing?</h2>
            <p>{analysis.interpretation}</p>
            <div className="detail-row"><span>Region</span><b>{region}</b></div>
            <div className="detail-row"><span>Years analyzed</span><b>{analysis.start_year}–{analysis.end_year}</b></div>
            <div className="detail-row"><span>Annual observations</span><b>{analysis.observations}</b></div>
            <div className="detail-row"><span>Significance threshold</span><b>p &lt; 0.05</b></div>
          </article>
          <article className="panel region-panel">
            <p className="eyebrow">05 / REGIONAL COMPARISON</p><h2>How regions differ</h2>
            <p className="muted small">Trend rate for each region, in {unit} per year.</p>
            {regions.map(r => <div className="region-row" key={r.region}><div><b>{r.region}</b><small>{r.direction} · p={r.p_value}</small></div><strong className={r.slope_per_year >= 0 ? 'increasing' : 'decreasing'}>{r.slope_per_year > 0 ? '+' : ''}{r.slope_per_year}</strong></div>)}
          </article>
        </section>
      </>}

      <section className="disclaimer"> <b>Important scientific note</b><p>This starter project uses synthetic demonstration values, not official NASA or NOAA observations. Its p-values are produced by a simple linear regression and do not account for autocorrelation, seasonality, measurement uncertainty or multiple testing. Use quality-controlled mission data and suitable statistical methods before drawing scientific conclusions.</p></section>
      <footer>EARTH TREND DETECTIVE <span>Learning project · Built with React + Python</span></footer>
    </main>
  </div>;
}
