# RRTS

## Overview

This repository contains code for a project involving multiple languages and frameworks, including C, C++, JavaScript, and Python. It also utilizes Node.js and a Python Framework. Specific functionality is not explicitly defined in the provided context, so this README will assume a general use case related to complaint management based on the code snippets.

## Key Features & Benefits

*   **Firebase Integration:** Utilizes Firebase for real-time database and cloud functions.
*   **Complaint Management:**  Handles complaint data with status tracking.
*   **Asynchronous Status Synchronization:**  Uses Firebase Cloud Functions to synchronize complaint status changes to related assessments.
*   **Data Validation:** Implements data checking using Python.
*   **Image Processing:**  Possibly utilizes PIL (Pillow) for image handling (AVIF specifically).

## Prerequisites & Dependencies

Before running the project, ensure you have the following installed:

*   **Python:**  (Version compatible with `requirements.txt`)
*   **Node.js:** (For Firebase Cloud Functions)
*   **Firebase CLI:** (For deploying Cloud Functions)
*   **C/C++ Compiler:** (If compiling any C/C++ components)

**Python Dependencies:**

Install the required Python packages using pip:

```bash
pip install -r backend/requirements.txt
```

**Node.js Dependencies:**

Navigate to the backend directory and install the required Node.js modules:

```bash
cd backend
npm install firebase-functions firebase-admin --save
```

## Installation & Setup Instructions

1.  **Clone the Repository:**

    ```bash
    git clone https://github.com/VergilDsanji66/RRTS.git
    cd RRTS
    ```

2.  **Firebase Setup:**

    *   Create a Firebase project in the [Firebase Console](https://console.firebase.google.com/).
    *   Download the service account key JSON file and place it in the `backend/` directory, renaming it to `serviceAccountKey.json`.
    *   Set up the Firebase CLI:

        ```bash
        npm install -g firebase-tools
        firebase login
        firebase init
        ```

        Configure Firebase CLI to use your project.

3.  **Environment Configuration:**

    *   Verify the `databaseURL` in `backend/firebase_config.py` matches your Firebase project's Realtime Database URL.

4. **Virtual Environment (Python):**

    It is recommended to create a virtual environment to isolate project dependencies.

    ```bash
    cd backend
    python3 -m venv venv
    source venv/bin/activate  # On Linux/macOS
    # venv\Scripts\activate  # On Windows
    pip install -r requirements.txt
    ```

5. **Deploy Firebase Functions:**

    ```bash
    cd backend
    firebase deploy --only functions
    ```

## Usage Examples & API Documentation

Specific usage examples would depend on the project's purpose. However, based on the file names and snippets:

*   `backend/main.py`: Likely the main entry point for the Python backend.  It probably utilizes Flask or FastAPI to create endpoints.
*   `backend/data_checker.py`: Contains classes and functions for data validation.
*   `backend/functions.js`: Contains Firebase Cloud Functions triggered by changes in the Realtime Database. The provided function `syncComplaintStatus` synchronizes status changes from `/Complaints` to `/Assessments`.

**Example (Conceptual - Python Backend):**

```python
# Example usage within a FastAPI endpoint in main.py (hypothetical)
from fastapi import FastAPI
from backend.data_checker import Complaint
from backend.firebase_config import initialize_firebase

app = FastAPI()
db = initialize_firebase()

@app.post("/complaints/")
async def create_complaint(complaint: Complaint):
    complaint_ref = db.reference("Complaints")
    complaint_ref.child(complaint.id).set(complaint.dict())
    return {"message": "Complaint created successfully"}
```

## Configuration Options

*   **Firebase Database URL:** Configure in `backend/firebase_config.py`.
*   **Service Account Key:**  Ensure `backend/serviceAccountKey.json` is correctly configured.
*   **Cloud Function Triggers:** The Firebase function `syncComplaintStatus` is triggered on updates to the `/Complaints/{complaintId}/status` path in the Realtime Database.  Modify this path in `backend/functions.js` as needed.
*   **`DECODE_CODEC_CHOICE` for AVIF images:** This configuration can be used to change the AVIF decoding method in the PIL library. You can define this globally, but without more context it's difficult to apply here.

## Contributing Guidelines

1.  Fork the repository.
2.  Create a new branch for your feature or bug fix.
3.  Make your changes and commit them with descriptive messages.
4.  Push your changes to your fork.
5.  Submit a pull request to the main repository.

## License Information

License information is not specified. Please add a license file (e.g., `LICENSE.txt`) and specify the license type.  Common options include MIT, Apache 2.0, or GPL.

## Acknowledgments

*   Firebase for providing the Realtime Database and Cloud Functions.
*   The Python Pillow (PIL) library for image processing.
