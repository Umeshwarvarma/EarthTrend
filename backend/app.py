from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd
from scipy.stats import linregress
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DATA_FILE = BASE_DIR / "data" / "earth_data.csv"

app = Flask(__name__)
CORS(app)

VARIABLES = {
    "temperature": {"label": "Temperature anomaly", "unit": "°C"},
    "rainfall": {"label": "Annual rainfall", "unit": "mm"},
    "sea_level": {"label": "Sea level", "unit": "mm"},
    "ndvi": {"label": "Vegetation index (NDVI)", "unit": "index"}
}

def load_data():
    df = pd.read_csv(DATA_FILE)
    df["year"] = pd.to_numeric(df["year"], errors="coerce")
    for col in VARIABLES:
        df[col] = pd.to_numeric(df[col], errors="coerce")
    return df.dropna(subset=["year"])

@app.get("/")
def home():
    return jsonify({"message": "EarthTrend API is running"})

@app.get("/api/options")
def options():
    df = load_data()
    return jsonify({
        "variables": VARIABLES,
        "regions": sorted(df["region"].dropna().unique().tolist()),
        "min_year": int(df["year"].min()),
        "max_year": int(df["year"].max())
    })

@app.get("/api/data")
def get_data():
    df = load_data()
    variable = request.args.get("variable", "temperature")
    region = request.args.get("region", "All")
    start = int(request.args.get("start_year", df["year"].min()))
    end = int(request.args.get("end_year", df["year"].max()))

    if variable not in VARIABLES:
        return jsonify({"error": "Unknown variable"}), 400

    filtered = df[(df["year"] >= start) & (df["year"] <= end)]
    if region != "All":
        filtered = filtered[filtered["region"] == region]

    grouped = filtered.groupby("year", as_index=False)[variable].mean()
    records = [
        {"year": int(row["year"]), "value": round(float(row[variable]), 4)}
        for _, row in grouped.iterrows() if pd.notna(row[variable])
    ]
    return jsonify({
        "variable": variable,
        "label": VARIABLES[variable]["label"],
        "unit": VARIABLES[variable]["unit"],
        "region": region,
        "records": records
    })

@app.get("/api/analysis")
def analysis():
    df = load_data()
    variable = request.args.get("variable", "temperature")
    region = request.args.get("region", "All")
    start = int(request.args.get("start_year", df["year"].min()))
    end = int(request.args.get("end_year", df["year"].max()))

    if variable not in VARIABLES:
        return jsonify({"error": "Unknown variable"}), 400

    filtered = df[(df["year"] >= start) & (df["year"] <= end)]
    if region != "All":
        filtered = filtered[filtered["region"] == region]

    grouped = filtered.groupby("year", as_index=False)[variable].mean().dropna()
    if len(grouped) < 3:
        return jsonify({"error": "At least three yearly observations are needed."}), 400

    result = linregress(grouped["year"], grouped[variable])
    slope = float(result.slope)
    p_value = float(result.pvalue)
    direction = "Increasing" if slope > 0 else "Decreasing" if slope < 0 else "Stable"
    significant = p_value < 0.05

    return jsonify({
        "variable": variable,
        "label": VARIABLES[variable]["label"],
        "unit": VARIABLES[variable]["unit"],
        "region": region,
        "start_year": int(grouped["year"].min()),
        "end_year": int(grouped["year"].max()),
        "observations": int(len(grouped)),
        "direction": direction,
        "slope_per_year": round(slope, 5),
        "p_value": round(p_value, 6),
        "significant": significant,
        "significance_level": 0.05,
        "interpretation": (
            "The linear trend is statistically significant at the 0.05 level."
            if significant else
            "The data do not provide sufficient evidence of a linear trend at the 0.05 level."
        )
    })

@app.get("/api/regions")
def regions():
    df = load_data()
    variable = request.args.get("variable", "temperature")
    start = int(request.args.get("start_year", df["year"].min()))
    end = int(request.args.get("end_year", df["year"].max()))
    if variable not in VARIABLES:
        return jsonify({"error": "Unknown variable"}), 400

    filtered = df[(df["year"] >= start) & (df["year"] <= end)]
    output = []
    for region, part in filtered.groupby("region"):
        yearly = part.groupby("year", as_index=False)[variable].mean().dropna()
        if len(yearly) < 3:
            continue
        fit = linregress(yearly["year"], yearly[variable])
        output.append({
            "region": region,
            "slope_per_year": round(float(fit.slope), 5),
            "p_value": round(float(fit.pvalue), 6),
            "significant": bool(fit.pvalue < 0.05),
            "direction": "Increasing" if fit.slope > 0 else "Decreasing" if fit.slope < 0 else "Stable"
        })
    return jsonify(output)

if __name__ == "__main__":
    app.run(debug=True, port=5000)
