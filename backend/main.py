import os
import shutil
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.database import get_db_connection, init_db
from backend.yolo_detector import YOLODetector
from backend.question_engine import get_recommended_questions
import backend.models as models

app = FastAPI(title="BioByte API", version="1.0.0")

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
        recommended_questions = get_recommended_questions(primary_match)
        
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

# --- 3. MY PLANTS (USER'S ACTIVE PLANTS) ---
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
        
        # Add dynamic calculations
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
    cursor.execute("SELECT id FROM plants WHERE id = ?;", (payload.plant_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Plant template not found")
        
    cursor.execute("""
        INSERT INTO user_plants (plant_id, custom_name, health_status, last_watered, last_fertilized, added_at, image_url, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    """, (
        payload.plant_id,
        payload.custom_name,
        payload.health_status,
        payload.last_watered or now_str,
        payload.last_fertilized or now_str,
        now_str,
        payload.image_url,
        payload.notes
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
    
    # Update last_watered
    cursor.execute("""
        UPDATE user_plants
        SET last_watered = ?
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
        SET last_fertilized = ?
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

# --- 5. ANALYTICS ENDPOINT ---
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
    # Ensure all statuses represented
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
        
        # Add water task
        water_due_date = datetime.fromisoformat(care["next_watering"])
        upcomingTasks.append({
            "id": r["id"] * 1000 + 1,  # Unique task ID
            "plantName": r["custom_name"],
            "taskType": "Watering",
            "dueDate": water_due_date.strftime("%b %d"),
            "daysRemaining": care["water_days_remaining"]
        })
        
        # Add fertilize task
        fert_due_date = datetime.fromisoformat(care["next_fertilizing"])
        upcomingTasks.append({
            "id": r["id"] * 1000 + 2,  # Unique task ID
            "plantName": r["custom_name"],
            "taskType": "Fertilizer",
            "dueDate": fert_due_date.strftime("%b %d"),
            "daysRemaining": care["fertilize_days_remaining"]
        })
        
    # Sort upcoming tasks by days remaining
    upcomingTasks = sorted(upcomingTasks, key=lambda t: t["daysRemaining"])
    
    return {
        "wateringFrequency": wateringFrequency,
        "healthStatus": healthStatus,
        "weeklyActivity": weeklyActivity,
        "upcomingTasks": upcomingTasks
    }

# --- 6. CALENDAR ENDPOINT ---
@app.get("/api/calendar")
def get_calendar_events():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. Past Logs (completed events)
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
            "type": r["action_type"], # 'Watered', 'Fertilized', 'Note Added'
            "status": "completed",
            "notes": r["notes"]
        })
        
    # 2. Future predicted actions based on frequency
    cursor.execute("""
        SELECT up.*, p.name as plant_name, p.watering_days, p.fertilizer
        FROM user_plants up
        JOIN plants p ON up.plant_id = p.id;
    """)
    up_rows = cursor.fetchall()
    conn.close()
    
    now = datetime.now()
    # Generate schedule for the next 30 days
    for r in up_rows:
        care = get_plant_care_details(r, now)
        
        # Watering predictions
        last_watered = datetime.fromisoformat(r["last_watered"])
        water_interval = timedelta(days=r["watering_days"])
        current_prediction = last_watered + water_interval
        
        # Predict waterings for 30 days
        for _ in range(5): # Limit predictions
            if current_prediction > now + timedelta(days=30):
                break
            # Only list upcoming/future
            events.append({
                "id": f"pred-water-{r['id']}-{current_prediction.strftime('%Y%m%d')}",
                "title": f"Water {r['custom_name']}",
                "date": current_prediction.strftime("%Y-%m-%d"),
                "type": "Watered",
                "status": "upcoming",
                "notes": f"Scheduled watering every {r['watering_days']} days"
            })
            current_prediction += water_interval
            
        # Fertilizing predictions
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
        
        # Predict fertilizing for 30 days
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

# --- 7. NOTIFICATIONS ENDPOINT ---
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
    
    # Counter for notification ID
    notif_id = 1
    
    for r in rows:
        care = get_plant_care_details(r, now)
        
        # 1. Watering Notifications
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
            
        # 2. Fertilizer Notifications
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
        elif care["fertilize_days_remaining"] == 0 or care["fertilize_days_remaining"] == 1:
            notifications.append({
                "id": notif_id,
                "plant_id": r["id"],
                "type": "fertilizer_reminder",
                "title": "Fertilizer Reminder",
                "message": f"{r['custom_name']} is due for its {r['fertilizer']} fertilizer feed.",
                "severity": "info",
                "timestamp": care["next_fertilizing"]
            })
            notif_id += 1
            
    return notifications
