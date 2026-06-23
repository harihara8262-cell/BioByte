import os
import shutil
import random
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.database import get_db_connection, init_db
from backend.yolo_detector import YOLODetector
from backend.question_engine import get_recommended_questions
import backend.models as models

app = FastAPI(title="BioByte API", version="1.1.0")

# Enable CORS for React frontend (development and production ports)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure directories exist
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Mount static files directories
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Initialize DB on startup
@app.on_event("startup")
def startup_event():
    init_db()

detector = YOLODetector()

# Helper function to compute status/remaining days for user plants
def get_plant_care_details(row, now=None):
    if now is None:
        now = datetime.now()
        
    last_watered = datetime.fromisoformat(row["last_watered"])
    last_fertilized = datetime.fromisoformat(row["last_fertilized"])
    
    # Target periods
    water_interval = timedelta(days=row["watering_days"])
    
    # Parse fertilizer string, e.g., 'every 14 days', 'every 21 days', 'monthly' (30 days)
    fert_str = row["fertilizer"].lower()
    if "14" in fert_str:
        fert_days = 14
    elif "21" in fert_str:
        fert_days = 21
    elif "monthly" in fert_str:
        fert_days = 30
    else:
        fert_days = 14  # Default fallback
    fert_interval = timedelta(days=fert_days)
    
    next_watering = last_watered + water_interval
    next_fertilizing = last_fertilized + fert_interval
    
    water_diff = next_watering - now
    fert_diff = next_fertilizing - now
    
    water_days_rem = water_diff.days + (1 if water_diff.seconds > 0 else 0)
    fert_days_rem = fert_diff.days + (1 if fert_diff.seconds > 0 else 0)
    
    # Overwrite if difference is negative
    water_overdue = now > next_watering
    fert_overdue = now > next_fertilizing
    
    return {
        "water_days_remaining": water_days_rem if not water_overdue else -abs(water_diff.days),
        "fertilize_days_remaining": fert_days_rem if not fert_overdue else -abs(fert_diff.days),
        "water_overdue": water_overdue,
        "fertilize_overdue": fert_overdue,
        "next_watering": next_watering.isoformat(),
        "next_fertilizing": next_fertilizing.isoformat(),
    }

# --- 1. AI SCANNER ENDPOINT ---
@app.post("/api/detect", response_model=models.DetectResponse)
async def detect_plant(file: UploadFile = File(...)):
    # Save the file locally
    filename = f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Run detector
    detections = detector.detect(file_path)
    
    # If anything was detected, get the questions for the first detection
    recommended_questions = []
    if detections:
        primary_match = detections[0]["plant_name"]
        disease = detections[0]["disease_detected"]
        
        # Connect to DB to check and dynamically register custom plant type if missing
        if primary_match.lower() != "human face":
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM plants WHERE LOWER(name) = LOWER(?);", (primary_match,))
            plant_exists = cursor.fetchone()
            
            if not plant_exists:
                # Insert default template for the newly detected plant
                cursor.execute("""
                    INSERT INTO plants (name, watering_days, light, humidity, temperature, fertilizer)
                    VALUES (?, 5, 'bright indirect light', 'medium', '18-28', 'monthly');
                """, (primary_match,))
                conn.commit()
                
                # Insert standard recommended care questions for this plant
                q_data = [
                    (primary_match, "How often should I water this plant?", 
                     f"Water your {primary_match} every 5 days or when the top 2 inches of soil feel dry. Avoid overwatering."),
                    (primary_match, "What sunlight does it need?", 
                     f"It thrives in bright, indirect sunlight. Keep it away from harsh, direct rays to prevent leaf scorch."),
                    (primary_match, "Why are leaves turning yellow?", 
                     "Yellowing leaves are typically a sign of overwatering or soil drainage issues. Let soil dry out fully between waterings."),
                    (primary_match, "How to grow it faster?", 
                     f"Provide bright indirect light, water consistently when dry, and feed with balanced liquid fertilizer monthly."),
                    (primary_match, "Best soil type?", 
                     "A well-draining organic potting soil mixed with perlite or pumice to ensure good root aeration.")
                ]
                cursor.executemany("""
                    INSERT OR IGNORE INTO plant_questions (plant_name, question, answer)
                    VALUES (?, ?, ?);
                """, q_data)
                conn.commit()
            conn.close()
            
        recommended_questions = get_recommended_questions(primary_match, disease)
        
    # Relative path for image retrieval
    image_url = f"/uploads/{filename}"
    
    return {
        "success": True,
        "detections": detections,
        "recommended_questions": recommended_questions,
        "image_url": image_url
    }

# --- 2. CORE PLANTS TEMPLATES ---
@app.get("/api/plants", response_model=List[models.Plant])
def get_plants():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM plants;")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

# --- 3. MY PLANTS (USER'S ACTIVE PLANTS + DIGITAL TWINS) ---
@app.get("/api/my-plants")
def get_user_plants():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Join with plant template
    cursor.execute("""
        SELECT up.*, p.name as plant_name, p.watering_days, p.light, p.humidity, p.temperature, p.fertilizer
        FROM user_plants up
        JOIN plants p ON up.plant_id = p.id;
    """)
    rows = cursor.fetchall()
    conn.close()
    
    now = datetime.now()
    results = []
    
    # Setup digital twin calculations
    base_heights = {
        "Money Plant": 10.0,
        "Rose Plant": 25.0,
        "Mint": 8.0,
        "Hibiscus": 15.0
    }
    growth_rates = {
        "Money Plant": 0.4,  # cm per day
        "Rose Plant": 0.8,
        "Mint": 0.5,
        "Hibiscus": 0.6
    }
    
    for r in rows:
        p_dict = dict(r)
        
        # Structure the nested Plant details
        p_dict["plant"] = {
            "id": r["plant_id"],
            "name": r["plant_name"],
            "watering_days": r["watering_days"],
            "light": r["light"],
            "humidity": r["humidity"],
            "temperature": r["temperature"],
            "fertilizer": r["fertilizer"]
        }
        
        # Calculate dynamic digital twin growth curves
        added_dt = datetime.fromisoformat(r["added_at"])
        age_days = (now - added_dt).days + 1
        
        plant_name = r["plant_name"]
        base_h = base_heights.get(plant_name, 10.0)
        rate = growth_rates.get(plant_name, 0.4)
        
        # simulated growth: if watered regularly, grows faster.
        simulated_height = round(min(base_h + (rate * age_days), 150.0), 1)
        
        # growth stage
        if age_days < 5:
            stage = "Sprout"
        elif age_days < 18:
            stage = "Vegetative"
        else:
            stage = "Blooming" if plant_name in ["Rose Plant", "Hibiscus"] else "Mature"
            
        p_dict["age_days"] = age_days
        p_dict["height_cm"] = simulated_height
        p_dict["growth_stage"] = stage
        
        # Add dynamic care calculations
        care = get_plant_care_details(r, now)
        p_dict.update(care)
        results.append(p_dict)
        
    return results

@app.post("/api/my-plants", response_model=models.UserPlant)
def add_user_plant(payload: models.UserPlantCreate):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    now_str = datetime.now().isoformat()
    
    # Validate plant template exists
    cursor.execute("SELECT id, name FROM plants WHERE id = ?;", (payload.plant_id,))
    plant_row = cursor.fetchone()
    if not plant_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Plant template not found")
        
    # Default height base
    base_heights = {
        "Money Plant": 10.0,
        "Rose Plant": 25.0,
        "Mint": 8.0,
        "Hibiscus": 15.0
    }
    init_height = base_heights.get(plant_row["name"], 10.0)
        
    cursor.execute("""
        INSERT INTO user_plants (
            plant_id, custom_name, health_status, last_watered, last_fertilized, added_at, image_url, notes,
            health_score, disease_detected, height_cm, growth_stage, age_days
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, (
        payload.plant_id,
        payload.custom_name,
        payload.health_status,
        payload.last_watered or now_str,
        payload.last_fertilized or now_str,
        now_str,
        payload.image_url,
        payload.notes,
        payload.health_score or 100,
        payload.disease_detected or "None - Healthy",
        payload.height_cm or init_height,
        payload.growth_stage or "Vegetative",
        payload.age_days or 1
    ))
    
    new_id = cursor.lastrowid
    conn.commit()
    
    # Retrieve newly inserted plant
    cursor.execute("SELECT * FROM user_plants WHERE id = ?;", (new_id,))
    row = cursor.fetchone()
    conn.close()
    
    return dict(row)

@app.delete("/api/my-plants/{plant_id}")
def delete_user_plant(plant_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT id FROM user_plants WHERE id = ?;", (plant_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="User plant not found")
        
    cursor.execute("DELETE FROM user_plants WHERE id = ?;", (plant_id,))
    conn.commit()
    conn.close()
    return {"success": True, "message": "Plant deleted successfully"}

# --- 4. PLANT CARE ACTIONS ---
@app.post("/api/my-plants/{plant_id}/water")
def water_plant(plant_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if exists
    cursor.execute("SELECT id FROM user_plants WHERE id = ?;", (plant_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="User plant not found")
        
    now_str = datetime.now().isoformat()
    
    # Update last_watered and boost health score slightly
    cursor.execute("""
        UPDATE user_plants
        SET last_watered = ?,
            health_score = MIN(health_score + 15, 100),
            health_status = CASE 
                WHEN MIN(health_score + 15, 100) >= 85 THEN 'Excellent'
                WHEN MIN(health_score + 15, 100) >= 70 THEN 'Good'
                ELSE 'Needs Attention'
            END
        WHERE id = ?;
    """, (now_str, plant_id))
    
    # Log care action
    cursor.execute("""
        INSERT INTO care_logs (user_plant_id, action_type, timestamp, notes)
        VALUES (?, 'Watered', ?, 'Watered plant');
    """, (plant_id, now_str))
    
    conn.commit()
    conn.close()
    return {"success": True, "last_watered": now_str}

@app.post("/api/my-plants/{plant_id}/fertilize")
def fertilize_plant(plant_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if exists
    cursor.execute("SELECT id FROM user_plants WHERE id = ?;", (plant_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="User plant not found")
        
    now_str = datetime.now().isoformat()
    
    # Update last_fertilized
    cursor.execute("""
        UPDATE user_plants
        SET last_fertilized = ?,
            health_score = MIN(health_score + 10, 100)
        WHERE id = ?;
    """, (now_str, plant_id))
    
    # Log care action
    cursor.execute("""
        INSERT INTO care_logs (user_plant_id, action_type, timestamp, notes)
        VALUES (?, 'Fertilized', ?, 'Fertilized plant');
    """, (plant_id, now_str))
    
    conn.commit()
    conn.close()
    return {"success": True, "last_fertilized": now_str}

@app.post("/api/my-plants/{plant_id}/notes")
def add_note(plant_id: int, notes: str = Form(...)):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if exists
    cursor.execute("SELECT id FROM user_plants WHERE id = ?;", (plant_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="User plant not found")
        
    now_str = datetime.now().isoformat()
    
    # Update notes
    cursor.execute("""
        UPDATE user_plants
        SET notes = ?
        WHERE id = ?;
    """, (notes, plant_id))
    
    # Log care action
    cursor.execute("""
        INSERT INTO care_logs (user_plant_id, action_type, timestamp, notes)
        VALUES (?, 'Note Added', ?, ?);
    """, (plant_id, now_str, notes))
    
    conn.commit()
    conn.close()
    return {"success": True, "notes": notes}

# --- 5. EMERGENCY RECOVERY ENDPOINT ---
@app.get("/api/my-plants/{plant_id}/emergency")
def get_emergency_recovery(plant_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT up.*, p.name as plant_name 
        FROM user_plants up
        JOIN plants p ON up.plant_id = p.id
        WHERE up.id = ?;
    """, (plant_id,))
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        raise HTTPException(status_code=404, detail="User plant not found")
        
    disease = row["disease_detected"]
    plant_name = row["plant_name"]
    
    recovery_data = {
        "Root Rot": {
            "condition": f"Critical - Root Rot detected on your {plant_name}",
            "recovery_steps": [
                "1. Isolation: Move this pot away from other plants immediately.",
                "2. Surgical Cleaning: Remove the plant from the pot and wash the roots under running water.",
                "3. Root Pruning: Cut off all black, slimy, mushy roots using sterilized shears.",
                "4. Disinfect Pot: Wash the container thoroughly with warm soapy water and bleach.",
                "5. Fresh potting: Repot in fresh, dry soil mixed with perlite for drainage.",
                "6. Rest: Do not water the soil for 7-10 days to let the root wounds callus over."
            ],
            "treatment_recommendation": "Dust the remaining healthy roots with organic cinnamon powder or copper fungicide before repotting."
        },
        "Black Spot Fungus": {
            "condition": f"Warning - Black Spot Fungus detected on your {plant_name}",
            "recovery_steps": [
                "1. Pruning: Clip off all leaves containing black circular spots. Dispose of them immediately.",
                "2. Clear ground debris: Clean up fallen leaves from the topsoil to prevent reinfection.",
                "3. Safe Watering: Avoid overhead sprays; water the soil base directly.",
                "4. Air circulation: Separate this plant from others to improve ventilation."
            ],
            "treatment_recommendation": "Spray the entire plant foliage with organic neem oil or copper-based fungicide every 7 days."
        },
        "Rust Fungus": {
            "condition": f"Warning - Rust Fungus detected on your {plant_name}",
            "recovery_steps": [
                "1. Foliage sanitation: Pluck off leaves showing orange/brown pustules on the undersides.",
                "2. Restrict moisture: Ensure leaves remain dry during watering.",
                "3. Air flow: Keep the plant in a breezy, dry location."
            ],
            "treatment_recommendation": "Apply commercial sulfur spray or copper fungicide at the first sign of rust patches."
        },
        "Dehydration": {
            "condition": f"Needs Attention - Severe Dehydration on your {plant_name}",
            "recovery_steps": [
                "1. Deep Soak: Sit the entire pot in a tub of water for 30 minutes to saturate the soil cake.",
                "2. Trim dead stems: Clip off completely dry, brittle stems.",
                "3. Humidity: Mist the leaves daily or move to a humidifier zone."
            ],
            "treatment_recommendation": "Add a few drops of liquid seaweed extract to the water to help roots recover from drought stress."
        },
        "Aphid Infestation": {
            "condition": f"Warning - Aphids detected on your {plant_name}",
            "recovery_steps": [
                "1. Water spray: Wash the foliage with a firm spray from a hose to physically dislodge bugs.",
                "2. Soap spray: Wipe down the stems and leaf nodes.",
                "3. Isolate: Keep the plant away from healthy plants to prevent pest spreading."
            ],
            "treatment_recommendation": "Spray the plant thoroughly with insecticidal soap or 1% neem oil mixture every 3 days for two weeks."
        },
        "Nutrient Deficiency": {
            "condition": f"Needs Attention - Nutrient Deficiency on your {plant_name}",
            "recovery_steps": [
                "1. Soil check: Verify the potting medium isn't fully depleted or compacted.",
                "2. Prune old leaves: Trim yellowing leaves that are already dead."
            ],
            "treatment_recommendation": "Apply a balanced NPK liquid fertilizer (e.g. 10-10-10) watered down to half strength."
        }
    }
    
    default_recovery = {
        "condition": f"Healthy State - Your {plant_name} is in good shape.",
        "recovery_steps": [
            "1. Maintain regular watering schedule.",
            "2. Keep the plant in its optimal sunlight exposure range.",
            "3. Dust the leaves monthly with a damp cloth."
        ],
        "treatment_recommendation": "Apply regular slow-release organic fertilizer inputs once a month."
    }
    
    # Match recovery protocol
    for key, protocol in recovery_data.items():
        if key.lower() in disease.lower():
            return protocol
            
    return default_recovery

# --- 6. WEATHER AI ENGINE ENDPOINT ---
@app.get("/api/weather", response_model=models.WeatherResponse)
def get_weather():
    # Return simulated current weather
    return {
        "temperature": 28.4,
        "humidity": 62,
        "rain_probability": 45,
        "sunlight_intensity": "High",
        "forecast": "Scattered Clouds",
        "recommendation": "High evaporation detected. Water outdoor plants like Roses in the morning to prevent drying out."
    }

# --- 7. COMMUNITY NETWORK ENDPOINT ---
@app.get("/api/community", response_model=List[models.CommunityPost])
def get_community():
    return [
        {
            "id": 1,
            "author": "Dr. Avery Vance",
            "avatar": "A",
            "role": "Lead Botanist",
            "content": "Just analyzed a leaf sample from our balcony Rose Plant. Detected Powdery Mildew. Mixing baking soda, mild soap, and water works wonders to wipe it out!",
            "likes": 14,
            "comments_count": 3,
            "rating": 4.8,
            "timestamp": "2 hours ago"
        },
        {
            "id": 2,
            "author": "Elena Rostova",
            "avatar": "E",
            "role": "Orchid Specialist",
            "content": "My Money Plant digital twin indicates it will reach a whopping 20cm by next weekend! Keeping it in low-medium indirect light is definitely the sweet spot.",
            "likes": 9,
            "comments_count": 1,
            "rating": 4.6,
            "timestamp": "4 hours ago"
        },
        {
            "id": 3,
            "author": "Marcus Sterling",
            "avatar": "M",
            "role": "Herb Garden Enthusiast",
            "content": "A quick tip for Mint growers: harvesting or pinching off the top leaves regularly will force the mint to branch horizontally and grow extremely bushy!",
            "likes": 22,
            "comments_count": 5,
            "rating": 4.9,
            "timestamp": "1 day ago"
        }
    ]

# --- 8. ANALYTICS ENDPOINT ---
@app.get("/api/analytics", response_model=models.AnalyticsResponse)
def get_analytics():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. Watering Frequency
    cursor.execute("SELECT name, watering_days as days FROM plants;")
    water_freq_rows = cursor.fetchall()
    wateringFrequency = [{"name": r["name"], "days": r["days"]} for r in water_freq_rows]
    
    # 2. Health Status Count
    cursor.execute("""
        SELECT health_status as status, COUNT(*) as count 
        FROM user_plants 
        GROUP BY health_status;
    """)
    health_rows = cursor.fetchall()
    health_dict = {r["status"]: r["count"] for r in health_rows}
    all_statuses = ["Excellent", "Good", "Needs Attention", "Critical"]
    healthStatus = [{"status": s, "count": health_dict.get(s, 0)} for s in all_statuses]
    
    # 3. Weekly Activity (Past 7 days)
    now = datetime.now()
    weekly_activity_dict = {}
    for i in range(6, -1, -1):
        day_date = (now - timedelta(days=i)).strftime("%Y-%m-%d")
        weekly_activity_dict[day_date] = {"waterings": 0, "fertilizations": 0}
        
    cursor.execute("""
        SELECT action_type, DATE(timestamp) as act_date, COUNT(*) as cnt
        FROM care_logs
        WHERE timestamp >= ?
        GROUP BY action_type, act_date;
    """, ((now - timedelta(days=7)).isoformat(),))
    
    log_rows = cursor.fetchall()
    for r in log_rows:
        act_date = r["act_date"]
        action = r["action_type"]
        cnt = r["cnt"]
        if act_date in weekly_activity_dict:
            if action == "Watered":
                weekly_activity_dict[act_date]["waterings"] = cnt
            elif action == "Fertilized":
                weekly_activity_dict[act_date]["fertilizations"] = cnt
                
    weeklyActivity = [
        {
            "day": datetime.strptime(d, "%Y-%m-%d").strftime("%a"),
            "waterings": data["waterings"],
            "fertilizations": data["fertilizations"]
        }
        for d, data in weekly_activity_dict.items()
    ]
    
    # 4. Upcoming Tasks
    cursor.execute("""
        SELECT up.*, p.name as plant_name, p.watering_days, p.fertilizer
        FROM user_plants up
        JOIN plants p ON up.plant_id = p.id;
    """)
    up_rows = cursor.fetchall()
    conn.close()
    
    upcomingTasks = []
    for r in up_rows:
        care = get_plant_care_details(r, now)
        
        water_due_date = datetime.fromisoformat(care["next_watering"])
        upcomingTasks.append({
            "id": r["id"] * 1000 + 1,
            "plantName": r["custom_name"],
            "taskType": "Watering",
            "dueDate": water_due_date.strftime("%b %d"),
            "daysRemaining": care["water_days_remaining"]
        })
        
        fert_due_date = datetime.fromisoformat(care["next_fertilizing"])
        upcomingTasks.append({
            "id": r["id"] * 1000 + 2,
            "plantName": r["custom_name"],
            "taskType": "Fertilizer",
            "dueDate": fert_due_date.strftime("%b %d"),
            "daysRemaining": care["fertilize_days_remaining"]
        })
        
    upcomingTasks = sorted(upcomingTasks, key=lambda t: t["daysRemaining"])
    
    return {
        "wateringFrequency": wateringFrequency,
        "healthStatus": healthStatus,
        "weeklyActivity": weeklyActivity,
        "upcomingTasks": upcomingTasks
    }

# --- 9. CALENDAR ENDPOINT ---
@app.get("/api/calendar")
def get_calendar_events():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. Past Logs
    cursor.execute("""
        SELECT cl.*, up.custom_name
        FROM care_logs cl
        JOIN user_plants up ON cl.user_plant_id = up.id
        ORDER BY cl.timestamp DESC;
    """)
    log_rows = cursor.fetchall()
    
    events = []
    for r in log_rows:
        dt = datetime.fromisoformat(r["timestamp"])
        events.append({
            "id": f"log-{r['id']}",
            "title": f"{r['custom_name']} - {r['action_type']}",
            "date": dt.strftime("%Y-%m-%d"),
            "type": r["action_type"],
            "status": "completed",
            "notes": r["notes"]
        })
        
    # 2. Future predicted actions
    cursor.execute("""
        SELECT up.*, p.name as plant_name, p.watering_days, p.fertilizer
        FROM user_plants up
        JOIN plants p ON up.plant_id = p.id;
    """)
    up_rows = cursor.fetchall()
    conn.close()
    
    now = datetime.now()
    for r in up_rows:
        care = get_plant_care_details(r, now)
        
        # Waterings
        last_watered = datetime.fromisoformat(r["last_watered"])
        water_interval = timedelta(days=r["watering_days"])
        current_prediction = last_watered + water_interval
        for _ in range(5):
            if current_prediction > now + timedelta(days=30):
                break
            events.append({
                "id": f"pred-water-{r['id']}-{current_prediction.strftime('%Y%m%d')}",
                "title": f"Water {r['custom_name']}",
                "date": current_prediction.strftime("%Y-%m-%d"),
                "type": "Watered",
                "status": "upcoming",
                "notes": f"Scheduled watering every {r['watering_days']} days"
            })
            current_prediction += water_interval
            
        # Fertilizing
        last_fert = datetime.fromisoformat(r["last_fertilized"])
        fert_str = r["fertilizer"].lower()
        if "14" in fert_str:
            fert_days = 14
        elif "21" in fert_str:
            fert_days = 21
        elif "monthly" in fert_str:
            fert_days = 30
        else:
            fert_days = 14
        fert_interval = timedelta(days=fert_days)
        current_fert_prediction = last_fert + fert_interval
        
        for _ in range(3):
            if current_fert_prediction > now + timedelta(days=30):
                break
            events.append({
                "id": f"pred-fert-{r['id']}-{current_fert_prediction.strftime('%Y%m%d')}",
                "title": f"Fertilize {r['custom_name']}",
                "date": current_fert_prediction.strftime("%Y-%m-%d"),
                "type": "Fertilized",
                "status": "upcoming",
                "notes": f"Scheduled fertilization {r['fertilizer']}"
            })
            current_fert_prediction += fert_interval
            
    return events

# --- 10. NOTIFICATIONS ENDPOINT ---
@app.get("/api/notifications")
def get_notifications():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT up.*, p.name as plant_name, p.watering_days, p.fertilizer
        FROM user_plants up
        JOIN plants p ON up.plant_id = p.id;
    """)
    rows = cursor.fetchall()
    conn.close()
    
    now = datetime.now()
    notifications = []
    notif_id = 1
    
    # 1. Weather Alert (Simulated from weather engine)
    notifications.append({
        "id": notif_id,
        "plant_id": 0,
        "type": "weather_alert",
        "title": "🌤️ Weather Warning: High Evaporation",
        "message": "Local solar intensity is high today. We recommend watering outdoor Rose Plants early in the morning.",
        "severity": "info",
        "timestamp": now.isoformat()
    })
    notif_id += 1
    
    for r in rows:
        care = get_plant_care_details(r, now)
        disease = r["disease_detected"]
        
        # 2. Disease Warning
        if disease and "healthy" not in disease.lower():
            notifications.append({
                "id": notif_id,
                "plant_id": r["id"],
                "type": "disease_alert",
                "title": f"🚨 Disease Alert: {disease}",
                "message": f"Foliage analysis detected {disease} on your {r['custom_name']}. Open emergency mode to recover.",
                "severity": "critical",
                "timestamp": now.isoformat()
            })
            notif_id += 1
        
        # 3. Watering Notifications
        if care["water_overdue"]:
            days_overdue = abs(care["water_days_remaining"])
            notifications.append({
                "id": notif_id,
                "plant_id": r["id"],
                "type": "watering_overdue",
                "title": "Watering Overdue!",
                "message": f"Your {r['custom_name']} ({r['plant_name']}) was due for watering {days_overdue} day(s) ago.",
                "severity": "critical" if days_overdue >= 2 else "warning",
                "timestamp": care["next_watering"]
            })
            notif_id += 1
        elif care["water_days_remaining"] == 0 or care["water_days_remaining"] == 1:
            notifications.append({
                "id": notif_id,
                "plant_id": r["id"],
                "type": "watering_reminder",
                "title": "Watering Due Soon",
                "message": f"Don't forget to water {r['custom_name']} today or tomorrow.",
                "severity": "info",
                "timestamp": care["next_watering"]
            })
            notif_id += 1
            
        # 4. Fertilizer Notifications
        if care["fertilize_overdue"]:
            days_overdue = abs(care["fertilize_days_remaining"])
            notifications.append({
                "id": notif_id,
                "plant_id": r["id"],
                "type": "fertilizer_overdue",
                "title": "Fertilizer Due!",
                "message": f"Your {r['custom_name']} needs fertilizer. It is {days_overdue} day(s) overdue.",
                "severity": "warning",
                "timestamp": care["next_fertilizing"]
            })
            notif_id += 1
            
    return notifications
