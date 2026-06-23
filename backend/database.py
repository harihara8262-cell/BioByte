import sqlite3
import os
from datetime import datetime, timedelta

DB_PATH = os.path.join(os.path.dirname(__file__), "plants.db")

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # Enable foreign keys
    cursor.execute("PRAGMA foreign_keys = ON;")

    # 1. Core Plants Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS plants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        watering_days INTEGER NOT NULL,
        light TEXT NOT NULL,
        humidity TEXT NOT NULL,
        temperature TEXT NOT NULL,
        fertilizer TEXT NOT NULL
    );
    """)

    # 2. User's Active Plants (My Plants)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS user_plants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        plant_id INTEGER NOT NULL,
        custom_name TEXT NOT NULL,
        health_status TEXT NOT NULL, -- 'Excellent', 'Good', 'Needs Attention', 'Critical'
        last_watered TEXT NOT NULL, -- ISO Date
        last_fertilized TEXT NOT NULL, -- ISO Date
        added_at TEXT NOT NULL, -- ISO Date
        image_url TEXT,
        notes TEXT,
        FOREIGN KEY (plant_id) REFERENCES plants (id) ON DELETE CASCADE
    );
    """)

    # 3. Care Logs (for Analytics & Weekly Activity)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS care_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_plant_id INTEGER NOT NULL,
        action_type TEXT NOT NULL, -- 'Watered', 'Fertilized', 'Note Added'
        timestamp TEXT NOT NULL, -- ISO Date
        notes TEXT,
        FOREIGN KEY (user_plant_id) REFERENCES user_plants (id) ON DELETE CASCADE
    );
    """)

    # 4. Smart Questions Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS plant_questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        plant_name TEXT NOT NULL,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        UNIQUE(plant_name, question)
    );
    """)

    # --- Seed Default Plants ---
    plants_data = [
        ("Money Plant", 6, "low-medium indirect", "medium", "18-30", "monthly"),
        ("Rose Plant", 3, "full sunlight", "medium", "15-30", "every 14 days"),
        ("Mint", 3, "partial sunlight", "medium", "15-30", "every 21 days"),
        ("Hibiscus", 2, "full sunlight", "medium", "20-35", "every 14 days")
    ]

    for p in plants_data:
        cursor.execute("""
        INSERT OR IGNORE INTO plants (name, watering_days, light, humidity, temperature, fertilizer)
        VALUES (?, ?, ?, ?, ?, ?);
        """, p)

    # --- Seed Plant Questions & Answers ---
    questions_data = [
        # Money Plant
        ("Money Plant", "How often should I water this plant?", 
         "Water your Money Plant every 6 days or when the top 2 inches of soil are dry. Avoid waterlogged soil to prevent root rot."),
        ("Money Plant", "What sunlight does it need?", 
         "It thrives in bright, indirect sunlight but can tolerate low to medium light. Avoid direct scorching sun, which can burn leaves."),
        ("Money Plant", "Why are leaves turning yellow?", 
         "Yellowing leaves are usually a sign of overwatering. Make sure the pot has good drainage and the soil dries between waterings."),
        ("Money Plant", "How to grow it faster?", 
         "Provide bright indirect light, water consistently when dry, and feed with balanced liquid fertilizer monthly during spring/summer."),
        ("Money Plant", "Best soil type?", 
         "Use a well-draining organic potting mix. Mixing in perlite or coco coir will help keep it aerated and prevent compacting."),

        # Rose Plant
        ("Rose Plant", "How often should I water this plant?", 
         "Water every 3 days. Roses need deep watering. Soak the root zone directly and avoid wetting the leaves to prevent fungal disease."),
        ("Rose Plant", "How to increase flowering?", 
         "Prune regularly, pinch off dead blooms (deadheading), ensure it gets 6+ hours of full sun, and fertilize every 14 days."),
        ("Rose Plant", "Why are leaves turning black?", 
         "Black spots on leaves usually indicate Black Spot fungal disease. Treat with neem oil, prune affected leaves, and keep foliage dry."),
        ("Rose Plant", "Best fertilizer?", 
         "Use a specialized rose fertilizer rich in potassium and phosphorus, or apply bone meal and compost every 14 days."),
        ("Rose Plant", "Sunlight requirements?", 
         "Roses need full, direct sunlight. Place them in a spot where they receive at least 6 to 8 hours of sun daily."),

        # Mint
        ("Mint", "Watering schedule?", 
         "Water every 3 days. Mint plants love consistent moisture. Keep the soil damp but not soggy, and check soil daily in hot weather."),
        ("Mint", "Sunlight requirement?", 
         "Mint prefers partial sunlight (morning sun is great) but can grow in full sun if the soil is kept adequately moist."),
        ("Mint", "Why is it drying?", 
         "Mint has shallow roots and dries out quickly. If it wilts or dries, it needs immediate deep watering. Cut dry stems to regrow."),
        ("Mint", "How to make it bushy?", 
         "Harvest the tops regularly! Pinching off the top growth triggers lateral branching, creating a much bushier, healthier plant."),
        ("Mint", "Best soil?", 
         "Rich, moist, well-draining soil with a pH between 6.0 and 7.0. Adding compost helps retain the moisture they love."),

        # Hibiscus
        ("Hibiscus", "Watering schedule?", 
         "Water every 2 days. Hibiscus is a thirsty plant, especially when blooming. Ensure excellent drainage to prevent root rot."),
        ("Hibiscus", "Sunlight requirement?", 
         "Full, direct sunlight is key. It needs at least 6 hours of bright light daily to produce its signature large, vibrant blooms."),
        ("Hibiscus", "Why are leaves yellow?", 
         "Usually due to underwatering, cold drafts, or nutrient deficiency. Keep it warm and check soil moisture regularly."),
        ("Hibiscus", "How to increase flowers?", 
         "Feed with high-potassium fertilizer, keep in a sunny spot, prune deadwood in early spring, and maintain high humidity."),
        ("Hibiscus", "Best fertilizer?", 
         "Feed every 14 days with a water-soluble fertilizer that is high in potassium, moderate in nitrogen, and low in phosphorus.")
    ]

    for q in questions_data:
        cursor.execute("""
        INSERT OR IGNORE INTO plant_questions (plant_name, question, answer)
        VALUES (?, ?, ?);
        """, q)

    # --- Seed Sample User Plants (if none exist) ---
    cursor.execute("SELECT COUNT(*) FROM user_plants;")
    user_plants_count = cursor.fetchone()[0]

    if user_plants_count == 0:
        now = datetime.now()
        # Seed 3 plants:
        # 1. Money Plant (Healthy)
        # 2. Rose Plant (Healthy)
        # 3. Mint (Needs Attention - watered 4 days ago, water due is 3 days!)
        
        # Get plant IDs
        cursor.execute("SELECT id FROM plants WHERE name = 'Money Plant';")
        money_id = cursor.fetchone()[0]
        cursor.execute("SELECT id FROM plants WHERE name = 'Rose Plant';")
        rose_id = cursor.fetchone()[0]
        cursor.execute("SELECT id FROM plants WHERE name = 'Mint';")
        mint_id = cursor.fetchone()[0]

        # Insert user plants
        cursor.execute("""
        INSERT INTO user_plants (plant_id, custom_name, health_status, last_watered, last_fertilized, added_at, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?);
        """, (
            money_id, 
            "Golden Pothos", 
            "Excellent", 
            (now - timedelta(days=2)).isoformat(), 
            (now - timedelta(days=12)).isoformat(), 
            (now - timedelta(days=15)).isoformat(),
            "Hanging in the living room corner. Growing beautifully!"
        ))
        p1_id = cursor.lastrowid

        cursor.execute("""
        INSERT INTO user_plants (plant_id, custom_name, health_status, last_watered, last_fertilized, added_at, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?);
        """, (
            rose_id, 
            "Ruby Crimson", 
            "Good", 
            (now - timedelta(days=1)).isoformat(), 
            (now - timedelta(days=5)).isoformat(), 
            (now - timedelta(days=8)).isoformat(),
            "Balcony plant. Getting full morning sun. First buds appearing."
        ))
        p2_id = cursor.lastrowid

        cursor.execute("""
        INSERT INTO user_plants (plant_id, custom_name, health_status, last_watered, last_fertilized, added_at, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?);
        """, (
            mint_id, 
            "Fresh Mojito", 
            "Needs Attention", 
            (now - timedelta(days=4)).isoformat(), # 4 days ago (needs watering every 3 days!)
            (now - timedelta(days=22)).isoformat(), # 22 days ago (needs fertilizing every 21 days!)
            (now - timedelta(days=25)).isoformat(),
            "Kitchen sill. Some lower leaves look slightly dry."
        ))
        p3_id = cursor.lastrowid

        # --- Seed Care Logs (For Analytics Charts) ---
        # Let's seed waterings for the past two weeks to make the graph look alive
        log_actions = [
            (p1_id, "Watered", (now - timedelta(days=14)).isoformat(), "Regular watering"),
            (p1_id, "Watered", (now - timedelta(days=8)).isoformat(), "Regular watering"),
            (p1_id, "Watered", (now - timedelta(days=2)).isoformat(), "Regular watering"),
            (p1_id, "Fertilized", (now - timedelta(days=12)).isoformat(), "Monthly liquid food"),

            (p2_id, "Watered", (now - timedelta(days=7)).isoformat(), "Deep watering"),
            (p2_id, "Watered", (now - timedelta(days=4)).isoformat(), "Deep watering"),
            (p2_id, "Watered", (now - timedelta(days=1)).isoformat(), "Deep watering"),
            (p2_id, "Fertilized", (now - timedelta(days=5)).isoformat(), "Rose bloom mix"),

            (p3_id, "Watered", (now - timedelta(days=19)).isoformat(), "Moistened soil"),
            (p3_id, "Watered", (now - timedelta(days=16)).isoformat(), "Moistened soil"),
            (p3_id, "Watered", (now - timedelta(days=13)).isoformat(), "Moistened soil"),
            (p3_id, "Watered", (now - timedelta(days=10)).isoformat(), "Moistened soil"),
            (p3_id, "Watered", (now - timedelta(days=7)).isoformat(), "Moistened soil"),
            (p3_id, "Watered", (now - timedelta(days=4)).isoformat(), "Moistened soil"),
            (p3_id, "Fertilized", (now - timedelta(days=22)).isoformat(), "Organic compost tea")
        ]

        cursor.executemany("""
        INSERT INTO care_logs (user_plant_id, action_type, timestamp, notes)
        VALUES (?, ?, ?, ?);
        """, log_actions)

    conn.commit()
    conn.close()
    print("Database initialized successfully!")

if __name__ == "__main__":
    init_db()
