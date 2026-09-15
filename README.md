# Portfolio Demo Projects

A collection of full-stack demo applications showcasing web development skills with Python, JavaScript, and modern web technologies.

## 🚀 Projects

### 1. Modern Landing Page
A responsive, modern landing page with smooth animations and professional design.

- **Tech Stack**: HTML5, CSS3, JavaScript
- **Features**: Responsive design, smooth scrolling, contact form, animations
- **[View Demo →](./landing-page/)**

### 2. E-Commerce Demo
Full-stack e-commerce application with shopping cart, product management, and checkout flow.

- **Tech Stack**: Python (Flask), SQLite, HTML/CSS/JavaScript
- **Features**:
  - Product catalog with search and filtering
  - Shopping cart functionality
  - User authentication
  - Admin panel for product management
  - RESTful API
- **[View Demo →](./ecommerce-demo/)**

### 3. Electric City — Fiber-Optic Build Manager
Full-stack internal tool for a fiber-optic installation contractor: buildings move through a
fixed 5-phase specialist pipeline (site survey, earthworks, construction, fiber blowing,
splicing), with Google Gemini reviewing each phase's uploaded photos/files against a
per-category checklist before the next phase unlocks.

- **Tech Stack**: Next.js 15 (App Router), Prisma/SQLite, NextAuth, Google Gemini API, Tailwind CSS
- **Features**:
  - AI-assisted review of uploaded evidence against a configurable checklist and the
    building's spec (BEP/BMO/cable entries, floor box counts)
  - Manager/staff roles, phase assignment, and a manual Telekom-clearance gate
  - Role-aware home dashboard, building activity timeline, and printable compliance reports
  - Restricted company-wide statistics page
  - Full English/Greek interface
  - Hardened file uploads (server-side type/size validation) and throttled login
  - Docker Compose deployment setup
- **[View project →](./electric-city/)**

## 📋 Setup Instructions

Each project has its own README with specific setup instructions. Generally:

### Python Projects (E-Commerce & API Backend)

```bash
# Navigate to project directory
cd project-name

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Linux/Mac:
source venv/bin/activate
# On Windows:
# venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the application
python app.py
```

### Landing Page

Simply open `index.html` in your browser or use a local server:

```bash
cd landing-page
python -m http.server 8000
```

## 🛠️ Technologies Used

- **Backend**: Python, Flask, FastAPI
- **Frontend**: HTML5, CSS3, JavaScript
- **Database**: SQLite
- **Authentication**: JWT, Session-based
- **API Documentation**: Swagger/OpenAPI

## 📝 License

MIT License - feel free to use these demos for learning and portfolio purposes.

## 👤 Author

Built as portfolio demonstration projects.
