# EarthTrend – Earth System Trend Detective

A beginner-friendly full-stack learning project for exploring environmental time-series data and detecting simple linear trends.

## Features
- Select temperature, rainfall, sea level, or NDVI.
- Filter by region and year range.
- View annual averages in a line chart.
- Calculate linear trend slope and p-value.
- Compare trend direction across regions.
- Export the selected time series as CSV.

## Important data note
`backend/data/earth_data.csv` contains **synthetic demonstration data** created for this project. It is not official NASA, NOAA, or satellite mission data. Do not present the sample results as real climate findings.

## Requirements
- Python 3.12 or newer
- Node.js 18 or newer
- VS Code (recommended)

## Step 1 – Open the project
Extract the ZIP file. Open the `EarthTrend` folder in VS Code.

## Step 2 – Start the backend
Open a terminal in VS Code:

```powershell
cd backend
py -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python app.py
```

If PowerShell blocks activation, run this in the same terminal:
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\venv\Scripts\Activate.ps1
```

The backend should run at:
`http://127.0.0.1:5000`

Test it by opening `http://127.0.0.1:5000/api/options` in your browser.

## Step 3 – Start the frontend
Open a **second** VS Code terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite, usually:
`http://localhost:5173`

Keep both terminals running while using the app.

## How the analysis works
1. The backend reads the CSV file using Pandas.
2. It filters rows by variable, region, and year.
3. It calculates the mean value for each year.
4. SciPy `linregress` fits a straight line to yearly values.
5. The slope gives the estimated change per year.
6. The p-value is compared with 0.05. A p-value below 0.05 is labelled statistically significant in this simple demonstration.

## Statistical limitations
This is an introductory ordinary least-squares linear regression. Environmental time series can contain autocorrelation, seasonality, missing observations, uneven sampling, measurement uncertainty, and multiple-comparison issues. The simple p-value does not address these. For scientific use, consider quality-controlled data, anomaly calculations, seasonal adjustment, Mann–Kendall tests, Sen's slope, confidence intervals, and appropriate spatial/multiple-testing corrections.

## Suggested authentic data sources
- NASA Earthdata: https://www.earthdata.nasa.gov/
- NASA POWER: https://power.larc.nasa.gov/
- NOAA Climate Data Online: https://www.ncei.noaa.gov/cdo-web/
- Copernicus Climate Data Store: https://cds.climate.copernicus.eu/

Check dataset documentation, units, spatial resolution, temporal coverage, missing-value codes, and license/attribution requirements before importing real data.

## Project folder structure
```text
EarthTrend/
├── backend/
│   ├── app.py
│   ├── requirements.txt
│   └── data/
│       └── earth_data.csv
├── frontend/
│   ├── index.html
│   ├── package.json
│   └── src/
│       ├── App.jsx
│       ├── main.jsx
│       └── style.css
└── README.md
```
