# main.py
from fastapi import FastAPI, HTTPException
from typing import List, Dict 
from fastapi.middleware.cors import CORSMiddleware
from data_checker import categorize_complaints, Complaint
import uvicorn

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/complaints/status", response_model=Dict[str, List[Complaint]])
async def get_complaints_by_status():
    return categorize_complaints()

@app.get("/complaints/status/{status}", response_model=List[Complaint])
async def get_complaints_by_specific_status(status: str):
    valid_statuses = ["completed", "assessed", "pending", "Pending"]  # Add both
    if status.lower() not in [s.lower() for s in valid_statuses]:  # Case-insensitive check
        raise HTTPException(status_code=400, detail="Invalid status")
    
    categorized = categorize_complaints()
    # Use case-insensitive lookup
    return categorized.get(status.lower().capitalize(), [])

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)