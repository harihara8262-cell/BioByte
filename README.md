# 🌿 BioByte - AI-Powered Plant Care Assistant

BioByte is a production-quality, futuristic plant monitoring and care assistant built with a **Glassmorphism + Dark Green + Emerald + Black** theme inspired by Apple, Notion, Linear, and modern AI dashboards.

---

## 🔗 Quick Start Localhost Links

Once the application servers are running, access them via:

* **🖥️ Frontend React Interface:** [http://localhost:5173](http://localhost:5173)
* **⚙️ FastAPI Swagger Documentation:** [http://localhost:8000/docs](http://localhost:8000/docs)
* **🔌 FastAPI Server Root:** [http://localhost:8000](http://localhost:8000)

---

## 🛠️ Technology Stack

### Frontend
* **Core:** React + TypeScript (Vite)
* **Styling:** Tailwind CSS v4 + Vanilla CSS Custom Glassmorphic overrides
* **Animations:** Framer Motion (Page slides, modal transitions, card floats)
* **Visuals:** Lucide React icons
* **Analytics:** Recharts (Weekly actions, benchmarks, health pie ratios)

### Backend
* **Server:** Python FastAPI
* **Database:** SQLite (Relational structure for plant templates, user gardens, notes, and activity care logging)
* **Computer Vision:** YOLOv8 (Detects *Money Plant*, *Rose Plant*, *Mint*, and *Hibiscus* with automatic bounding boxes; falls back to an RGB color histogram simulation if weights aren't locally present)

---

## 📂 Project Structure

```
BioByte/
├── backend/
│   ├── main.py              # FastAPI server routes, static files, and uploads mounting
│   ├── database.py          # SQLite connections, schema initialization, and seeding script
│   ├── models.py            # Pydantic schema declarations
│   ├── question_engine.py   # Care recommended Q&As SQLite query logic
│   ├── yolo_detector.py     # YOLOv8 engine (Simulated fallback / Real ultralytics pipeline)
│   ├── plants.db            # Local SQLite database file (ignored in git)
│   └── uploads/             # Directory for uploaded leaf scans (git ignored except placeholder)
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── Sidebar.tsx  # Central glassmorphism navigation menu
│   │   ├── pages/
│   │   │   ├── Home.tsx     # Canvas particle physics welcome screen
│   │   │   ├── Dashboard.tsx# Central greenhouse telemetry & database overview
│   │   │   ├── Scanner.tsx  # YOLOv8 upload portal & smart Q&A recommended panel
│   │   │   ├── MyPlants.tsx # Custom plant dashboard card grid & care actions
│   │   │   ├── Analytics.tsx# Recharts visual reports
│   │   │   ├── CalendarView.tsx # Custom monthly schedule tracker
│   │   │   ├── Notifications.tsx# Alert panel for overdue care items
│   │   │   └── Settings.tsx # Profile setups, theme accents, and data backup downloads
│   │   ├── App.tsx          # Router layout & page transition manager
│   │   └── index.css        # Tailwind v4 import & custom glass styles
│   ├── tailwind.config.js   # Design token config
│   ├── postcss.config.js    # PostCSS builder
│   └── tsconfig.app.json    # TypeScript configurations
└── .gitignore               # Root git exclusions file
```

---

## 🚀 Running Locally

### Prerequisites
1. **Python 3.8+**
2. **Node.js 18+**

### 1. Backend Setup & Startup
Navigate to the root directory, install dependencies, initialize the database, and launch the server:
```bash
# Install python packages
pip install fastapi uvicorn pillow pydantic python-multipart

# Initialize and seed plants.db SQLite database
python backend/database.py

# Start FastAPI server
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

### 2. Frontend Setup & Startup
Open a new terminal window, navigate to the `frontend` folder, install node packages, and run the developer server:
```bash
# Go to frontend folder
cd frontend

# Install UI packages
npm install

# Start Vite React server
npm run dev
```

---

## 🌿 YOLOv8 Object Detection Engine Details
The scanner uses **YOLOv8** to identify four target houseplant species:
1. **Money Plant** (Pothos)
2. **Rose Plant**
3. **Mint**
4. **Hibiscus**

When an image is uploaded:
- The system checks if `ultralytics` package is present and looks for a local `backend/best.pt` file.
- If not found, a **smart simulation engine** parses the image filename and RGB color signature (evaluating green vs red ratios) to select the correct species and draw a standard bounding box.
- The React frontend receives coordinates relative to the original image dimensions, captures the natural height and width on loading, and renders the bounding box outline correctly scaled to fit any browser viewport.
- Specific, pre-seeded care accordion cards automatically populate for the matched plant type.
