import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor, GradientBoostingClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import mean_absolute_error, r2_score, accuracy_score
import pickle, json, os, warnings
warnings.filterwarnings('ignore')

os.makedirs('models', exist_ok=True)
df = pd.read_csv('models/training_data.csv')

le_zone = LabelEncoder()
le_cat  = LabelEncoder()
df['zone_enc'] = le_zone.fit_transform(df['zone'])
df['cat_enc']  = le_cat.fit_transform(df['food_category'])

with open('models/zone_encoder.pkl','wb') as f: pickle.dump(le_zone, f)
with open('models/cat_encoder.pkl','wb')  as f: pickle.dump(le_cat, f)

# Model 1 — Demand Prediction
features_reg = ['zone_enc','cat_enc','day_of_week','hour','month',
                'is_weekend','is_evening','is_morning',
                'zone_ngos_active','listings_in_zone','avg_distance_km']
X_r = df[features_reg]; y_r = df['demand_kg']
X_tr, X_te, y_tr, y_te = train_test_split(X_r, y_r, test_size=0.2, random_state=42)
m1 = RandomForestRegressor(n_estimators=150, max_depth=10, random_state=42, n_jobs=-1)
m1.fit(X_tr, y_tr)
mae = mean_absolute_error(y_te, m1.predict(X_te))
r2  = r2_score(y_te, m1.predict(X_te))
with open('models/model_demand.pkl','wb') as f: pickle.dump(m1, f)
print(f"Demand model — MAE: {mae:.2f} kg  |  R²: {r2:.4f}")

# Model 2 — Fast Claim Prediction
features_clf = ['zone_enc','cat_enc','day_of_week','hour',
                'is_weekend','is_evening','zone_ngos_active',
                'listings_in_zone','avg_distance_km','urgency_score']
X_c = df[features_clf]; y_c = df['claimed_within_2hrs']
X_tc, X_ec, y_tc, y_ec = train_test_split(X_c, y_c, test_size=0.2, random_state=42)
m2 = GradientBoostingClassifier(n_estimators=100, max_depth=4, learning_rate=0.1, random_state=42)
m2.fit(X_tc, y_tc)
acc = accuracy_score(y_ec, m2.predict(X_ec))
with open('models/model_claim.pkl','wb') as f: pickle.dump(m2, f)
print(f"Claim model  — Accuracy: {acc*100:.1f}%")

metadata = {
    "demand_model":  {"type": "RandomForestRegressor",  "mae_kg": round(mae,2), "r2": round(r2,4)},
    "claim_model":   {"type": "GradientBoostingClassifier", "accuracy": round(acc,4)},
    "zones":       list(le_zone.classes_),
    "categories":  list(le_cat.classes_)
}
with open('models/model_metadata.json','w') as f: json.dump(metadata, f, indent=2)
print("Training complete. All models saved to models/")
