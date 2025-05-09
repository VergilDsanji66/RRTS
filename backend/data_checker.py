#data_cheacker.py
from firebase_config import initialize_firebase
from typing import Dict, List
from pydantic import BaseModel

class Complaint(BaseModel):
    id: str
    status: str
    description: str
    # Add other fields as needed

def get_complaints_from_firebase() -> List[Dict]:
    """Fetch complaints from Firebase RTDB"""
    ref = initialize_firebase()
    complaints = ref.child('Complaints').get()
    return [{"id": k, **v} for k, v in complaints.items()] if complaints else []

def categorize_complaints() -> Dict[str, List[Complaint]]:
    complaints = get_complaints_from_firebase()
    categorized = {
        "completed": [],
        "assessed": [],
        "Pending": []
    }
    
    for complaint in complaints:
        status = complaint.get("status", "Pending").lower()
        if status in categorized:
            categorized[status].append(Complaint(**complaint))
        else:
            categorized["Pending"].append(Complaint(**complaint))
    
    return categorized