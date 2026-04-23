from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle, json, numpy as np, os

app = Flask(__name__)
CORS(app)

BASE = os.path.join(os.path.dirname(__file__), 'models')
m_demand  = pickle.load(open(f'{BASE}/model_demand.pkl','rb'))
m_claim   = pickle.load(open(f'{BASE}/model_claim.pkl','rb'))
le_zone   = pickle.load(open(f'{BASE}/zone_encoder.pkl','rb'))
le_cat    = pickle.load(open(f'{BASE}/cat_encoder.pkl','rb'))
meta      = json.load(open(f'{BASE}/model_metadata.json'))

FEAT_REG = ['zone_enc','cat_enc','day_of_week','hour','month',
            'is_weekend','is_evening','is_morning',
            'zone_ngos_active','listings_in_zone','avg_distance_km']
FEAT_CLF = ['zone_enc','cat_enc','day_of_week','hour',
            'is_weekend','is_evening','zone_ngos_active',
            'listings_in_zone','avg_distance_km','urgency_score']

def encode(d):
    hour = d.get('hour', 12)
    dow  = d.get('day_of_week', 0)
    try: ze = int(le_zone.transform([d.get('zone','Central Delhi')])[0])
    except: ze = 0
    try: ce = int(le_cat.transform([d.get('food_category','Cooked Meals')])[0])
    except: ce = 0
    return {
        'zone_enc': ze, 'cat_enc': ce,
        'day_of_week': dow, 'hour': hour,
        'month': d.get('month', 1),
        'is_weekend': 1 if dow >= 5 else 0,
        'is_evening': 1 if 17 <= hour <= 21 else 0,
        'is_morning': 1 if 7  <= hour <= 11 else 0,
        'zone_ngos_active':  d.get('zone_ngos_active', 5),
        'listings_in_zone':  d.get('listings_in_zone', 3),
        'avg_distance_km':   d.get('avg_distance_km', 8.0),
        'urgency_score':     d.get('urgency_score', 0.6),
    }

@app.route('/health')
def health():
    return jsonify({"status":"ok","metrics": meta})

@app.route('/predict/demand', methods=['POST'])
def pred_demand():
    e = encode(request.json)
    X = np.array([[e[f] for f in FEAT_REG]])
    kg = round(float(m_demand.predict(X)[0]), 1)
    return jsonify({
        "predicted_demand_kg": kg,
        "urgency_level": "HIGH" if kg>25 else "MEDIUM" if kg>15 else "LOW"
    })

@app.route('/predict/claim', methods=['POST'])
def pred_claim():
    e = encode(request.json)
    X = np.array([[e[f] for f in FEAT_CLF]])
    prob = round(float(m_claim.predict_proba(X)[0][1]), 3)
    return jsonify({
        "claim_probability": prob,
        "claim_pct": f"{prob*100:.1f}%",
        "will_claim_fast": bool(m_claim.predict(X)[0]),
        "recommendation": "Post immediately — high demand" if prob>0.7
                          else "Normal priority" if prob>0.4
                          else "Low demand area"
    })

@app.route('/predict/full', methods=['POST'])
def pred_full():
    e = encode(request.json)
    Xr = np.array([[e[f] for f in FEAT_REG]])
    Xc = np.array([[e[f] for f in FEAT_CLF]])
    kg   = round(float(m_demand.predict(Xr)[0]), 1)
    prob = round(float(m_claim.predict_proba(Xc)[0][1]), 3)
    boost = round(min(1.0, (kg/50)*0.5 + prob*0.5), 3)
    return jsonify({
        "predicted_demand_kg": kg,
        "claim_probability": prob,
        "ai_boost_score": boost,
        "priority": "HIGH" if boost>0.7 else "MEDIUM" if boost>0.4 else "LOW"
    })

if __name__ == '__main__':
    print("ML API running -> http://localhost:5001")
    app.run(host='0.0.0.0', port=5001, debug=True)
