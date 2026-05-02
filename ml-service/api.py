from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle, json, numpy as np, os

app = Flask(__name__)
CORS(app)

BASE = os.path.join(os.path.dirname(__file__), 'models')
print(f"DEBUG: Loading models from {BASE}")

try:
    m_demand  = pickle.load(open(f'{BASE}/model_demand.pkl','rb'))
    m_claim   = pickle.load(open(f'{BASE}/model_claim.pkl','rb'))
    le_zone   = pickle.load(open(f'{BASE}/zone_encoder.pkl','rb'))
    le_cat    = pickle.load(open(f'{BASE}/cat_encoder.pkl','rb'))
    meta      = json.load(open(f'{BASE}/model_metadata.json'))
    
    # New NGO Model
    ngo_db    = json.load(open(f'{BASE}/ngo_database.json'))
    m_city    = pickle.load(open(f'{BASE}/city_classifier.pkl','rb'))
    
    print("DEBUG: All models loaded successfully")
except Exception as e:
    print(f"CRITICAL ERROR during model loading: {str(e)}")
    print(f"Current directory contents: {os.listdir('.')}")
    if os.path.exists('models'):
        print(f"Models directory contents: {os.listdir('models')}")
    raise e

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

@app.route('/predict/ngo', methods=['POST'])
def pred_ngo():
    data = request.json
    query = data.get('query', '').lower()
    
    if not query:
        return jsonify({"error": "No query provided"}), 400
    
    # Load Geodata for 1200+ Indian Cities
    try:
        with open('models/indian_cities_geodata.json', 'r', encoding='utf-8') as f:
            geodata = json.load(f)
    except:
        geodata = []

    # Use a Hybrid Approach: Comprehensive Geodata Match + ML
    try:
        if len(query) < 2:
            return jsonify({"found": False, "message": "Please enter a valid city name."})

        # 0. Normalise common aliases / alternate spellings
        CITY_ALIASES = {
            'bangalore': 'bengaluru', 'banglore': 'bengaluru', 'bangaluru': 'bengaluru',
            'bombay': 'mumbai', 'bombai': 'mumbai',
            'madras': 'chennai',
            'calcutta': 'kolkata', 'calcuta': 'kolkata',
            'poona': 'pune',
            'mysore': 'mysuru',
            'baroda': 'vadodara',
            'simla': 'shimla',
            'pondicherry': 'puducherry',
            'cochin': 'kochi',
            'trivandrum': 'thiruvananthapuram',
            'calicut': 'kozhikode',
            'trichur': 'thrissur',
            'ooty': 'udhagamandalam',
            'allahabad': 'prayagraj',
            'benares': 'varanasi', 'banaras': 'varanasi',
            'patna city': 'patna',
            'new delhi': 'delhi',
        }
        query_low = query.lower().strip()
        query_low = CITY_ALIASES.get(query_low, query_low)  # remap if alias matches

        # 1. Direct Keyword Match against 1200+ Geocoded Cities
        detected_city_obj = None
        
        # Sort by length descending to catch 'Navi Mumbai' before 'Mumbai'
        sorted_geodata = sorted(geodata, key=lambda x: len(x['city']), reverse=True)
        
        for item in sorted_geodata:
            if item['city'].lower() in query_low or query_low in item['city'].lower():
                detected_city_obj = item
                break
        
        detected_city = detected_city_obj['city'] if detected_city_obj else None
        max_prob = 1.0
        
        # 2. ML Fallback (For fuzzy queries)
        if not detected_city:
            detected_city = m_city.predict([query])[0]
            probs = m_city.predict_proba([query])[0]
            max_prob = np.max(probs)
            
            if max_prob < 0.05:
                return jsonify({
                    "found": False,
                    "message": f"I couldn't find a specific city match for '{query}'.",
                    "suggestions": ["Try checking official NGO portals", "Search on Google Maps"],
                    "search_query": query
                })
            
            # If ML found it, try to find geodata for it
            detected_city_obj = next((item for item in geodata if item["city"].lower() == detected_city.lower()), None)

        # Find NGOs for the detected city
        city_data = next((item for item in ngo_db if item["city"].lower() == detected_city.lower()), None)
        national_data = next((item for item in ngo_db if item["city"] == "National"), None)
        national_data = next((item for item in ngo_db if item["city"] == "National"), None)
        
        if city_data:
            return jsonify({
                "found": True,
                "city": detected_city,
                "confidence": round(float(max_prob), 2),
                "ngos": city_data["ngos"],
                "count": len(city_data["ngos"]),
                "note": f"Found local NGOs in {detected_city}.",
                "lat": detected_city_obj["latitude"] if detected_city_obj else None,
                "lng": detected_city_obj["longitude"] if detected_city_obj else None
            })
        else:
            # Fallback to National NGOs, but place them at the detected city's coordinates if available
            ngos = national_data["ngos"] if national_data else []
            if detected_city_obj:
                # Add city coordinates to these national NGOs so they show up on the map
                import random
                for ngo in ngos:
                    ngo["lat"] = detected_city_obj["latitude"] + random.uniform(-0.02, 0.02)
                    ngo["lng"] = detected_city_obj["longitude"] + random.uniform(-0.02, 0.02)

            return jsonify({
                "found": True,
                "city": detected_city,
                "confidence": round(float(max_prob), 2),
                "ngos": ngos,
                "count": len(ngos),
                "note": f"We don't have local data for {detected_city} yet, but here are national NGOs that operate across India.",
                "lat": detected_city_obj["latitude"] if detected_city_obj else None,
                "lng": detected_city_obj["longitude"] if detected_city_obj else None
            })
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("ML API running -> http://localhost:5001")
    app.run(host='0.0.0.0', port=5001, debug=True)
