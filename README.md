# Road Repair Tracking System

## Overview

This repository contains code for a project involving multiple languages and frameworks (C, C++, JavaScript, Python) and uses Node.js and Firebase. The project provides a system for tracking road repair requests and complaints, synchronizing status between records, and serving a web frontend.

## Key Features & Benefits

* **Firebase Integration:** Realtime Database and Cloud Functions for synchronization and background processing.
* **Complaint / Repair Tracking:** Store and track repair requests with status and images.
* **Backend Data Validation:** Python utilities for validating incoming data.
* **Frontend:** React app using Firebase for realtime UI updates.
* **Extensible:** Modular layout for adding workers, schedulers and additional services.

## Prerequisites & Dependencies

Before running the project, ensure you have the following installed:

* **Python** (compatible with backend/requirements.txt)
* **Node.js** (for Firebase Cloud Functions and frontend)
* **Firebase CLI** (for deploying Cloud Functions)
* **C/C++ Compiler** (if compiling native components)

## Installation & Setup Instructions

1. **Clone the Repository**

```bash
git clone https://github.com/VergilDsanji66/RRTS.git
cd RRTS
```

2. **Backend (Python + Firebase Functions)**
 
Set up the Python backend and Firebase functions.

- Create and activate a virtual environment (recommended):

```bash
cd backend
python3 -m venv venv
# source venv/bin/activate  # On Linux/macOS
venv\Scripts\activate  # On Windows (PowerShell use: .\venv\Scripts\Activate.ps1)
```

- Install Python dependencies:

```bash
pip install -r requirements.txt
```

- (If the backend also includes Node.js Firebase functions) install Node modules:

```bash
# from the backend directory
npm install firebase-functions firebase-admin --save
```

- Place your Firebase service account key in backend/serviceAccountKey.json (if required) and verify backend/firebase_config.py uses the correct databaseURL.

- Deploy Firebase functions:

```bash
# install Firebase CLI if you haven't
npm install -g firebase-tools
firebase login
firebase init
# choose Functions and follow prompts
firebase deploy --only functions
```

3. **Frontend (React + Firebase)**

Set up the frontend React app and Firebase dependencies.

```bash
cd frontend
# install Firebase and React dependencies
npm install firebase 
npm create vite@latest
npm install react-router-dom
# npx create-react-app .
```

- Initialize Firebase in the frontend (use your project's config in src/firebase.js or similar).
- Start the frontend dev server:

```bash
npm run dev
```

4. **Firebase Console Setup**

* Create a Firebase project at https://console.firebase.google.com/.
* Update backend/firebase_config.py and frontend Firebase config (e.g., src/firebase.js) with your project's credentials.
* Ensure Realtime Database rules and Storage rules match your security needs.

## Usage Examples & API Documentation

- backend/main.py: Example entrypoint (could be Flask or FastAPI) that exposes API endpoints for creating and updating repair requests.
- backend/data_checker.py: Data validation helpers.
- backend/functions.js: Firebase Cloud Functions that synchronize complaint status changes to related assessments (e.g., syncComplaintStatus triggered on /Complaints/{complaintId}/status updates).

Example (conceptual):

```python
from fastapi import FastAPI
from backend.data_checker import Complaint
from backend.firebase_config import initialize_firebase

app = FastAPI()
db = initialize_firebase()

@app.post('/complaints/')
async def create_complaint(complaint: Complaint):
    complaint_ref = db.reference('Complaints')
    complaint_ref.child(complaint.id).set(complaint.dict())
    return {'message': 'Complaint created successfully'}
```

## Configuration Options

* **Firebase Database URL:** Configure in backend/firebase_config.py.
* **Service Account Key:** Ensure backend/serviceAccountKey.json is present and correct.
* **Cloud Function Triggers:** Modify backend/functions.js paths as needed.
* **Environment variables:** Use .env files or a config/ folder to manage environment-specific settings.

## Contributing Guidelines

1. Fork the repository.
2. Create a branch for your feature or bugfix.
3. Commit changes with descriptive messages.
4. Push to your fork and open a pull request.

## License

Add a LICENSE file (e.g., MIT, Apache 2.0) to specify project licensing.

## Acknowledgments

* Firebase for realtime database and functions
* Pillow (PIL) for any image processing needs

Maintainer: @VergilDsanji66