# main.py
from fastapi import FastAPI, HTTPException
from typing import List, Dict 
from fastapi.middleware.cors import CORSMiddleware
from data_checker import (
    categorize_complaints, 
    Complaint,
    check_resource_availability,
    print_resource_status,
    ResourceStatus,
    prioritize_assessments,
    unassign_completed_resources  # Added missing import
)
import asyncio
from contextlib import asynccontextmanager
import uvicorn
import logging  # Added for logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup code
    try:
        status_report = print_resource_status()
        if status_report is None:
            logger.warning("Resource status check returned None - possible initialization issue")
        else:
            logger.info("Resource status check completed successfully")
    except Exception as e:
        logger.error(f"Startup error: {str(e)}", exc_info=True)
    yield
    # Shutdown code would go here

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

async def periodic_unassign():
    while True:
        try:
            unassign_completed_resources()
            logger.info("Periodic unassignment check completed")
        except Exception as e:
            logger.error(f"Error in periodic unassignment: {str(e)}")
        await asyncio.sleep(3600)  # Check every hour

@app.on_event("startup")  # Keep this for background tasks
async def startup_event():
    asyncio.create_task(periodic_unassign())

@app.get("/complaints/status", response_model=Dict[str, List[Complaint]])
async def get_complaints_by_status():
    try:
        return categorize_complaints()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/complaints/status/{status}", response_model=List[Complaint])
async def get_complaints_by_specific_status(status: str):
    valid_statuses = ["completed", "assessed", "pending", "Pending"]
    if status.lower() not in [s.lower() for s in valid_statuses]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    try:
        categorized = categorize_complaints()
        return categorized.get(status.lower().capitalize(), [])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/resources/status", response_model=Dict[str, List[ResourceStatus]])
async def get_resource_status():
    try:
        results, _ = check_resource_availability()
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/resources/print-status")
async def print_resources():
    try:
        results, prioritized = print_resource_status()
        return {
            "message": "Resource status printed to console",
            "resource_status": results,
            "prioritized_assessments": prioritized
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/assessments/prioritize")
async def prioritize_assessments_endpoint():
    try:
        prioritized = prioritize_assessments()
        return {
            "message": "Assessments prioritized successfully",
            "processing": prioritized['processing'],
            "on_hold": prioritized['on_hold']
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/assign-resources")
async def assign_resources():
    try:
        result = prioritize_assessments()
        return {
            "message": "Resources assigned successfully",
            "processing": len(result['processing']),
            "on_hold": len(result['on_hold'])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/unassign-completed")
async def unassign_completed():
    try:
        unassign_completed_resources()
        return {"message": "Completed resources unassigned successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)