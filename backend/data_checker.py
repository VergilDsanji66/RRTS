# data_checker.py 
from firebase_config import initialize_firebase
from typing import Dict, List, Tuple, Optional
from pydantic import BaseModel
from collections import defaultdict
from enum import Enum
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class LocalityPriority(Enum):
    COMMERCIAL = 1
    INDUSTRIAL = 2
    MIXED = 3
    RESIDENTIAL = 4

class Complaint(BaseModel):
    id: str
    status: str
    description: str
    issueType: str = None
    locationArea: str = None
    localityType: str = None
    orderNo: Optional[int] = None
    orderStatus: Optional[str] = None

class ResourceStatus(BaseModel):
    resource_type: str
    resource_name: str
    required: int
    available: int
    difference: int
    status: str  # "sufficient", "insufficient", "excess"

def get_complaints_from_firebase() -> List[Dict]:
    """Fetch complaints from Firebase RTDB"""
    ref = initialize_firebase()
    complaints = ref.child('Complaints').get()
    return [{"id": k, **v} for k, v in complaints.items()] if complaints else []

def get_assessments_from_firebase() -> List[Dict]:
    """Fetch assessments from Firebase RTDB"""
    ref = initialize_firebase()
    assessments = ref.child('Assessments').get()
    return [{"id": k, **v} for k, v in assessments.items()] if assessments else []

def update_assessment_order(assessment_id: str, order_no: int, order_status: str):
    """Update assessment with order number and status"""
    ref = initialize_firebase()
    ref.child(f'Assessments/{assessment_id}').update({
        'orderNo': order_no,
        'orderStatus': order_status
    })

def categorize_complaints() -> Dict[str, List[Complaint]]:
    complaints = get_complaints_from_firebase()
    categorized = {
        "completed": [],
        "assessed": [],
        "Pending": []
    }
    
    for complaint in complaints:
        status = complaint.get("status", "Pending")
        if status.lower() in categorized:
            categorized[status.lower()].append(Complaint(**complaint))
        else:
            categorized["Pending"].append(Complaint(**complaint))
    
    return categorized

def get_resource_data() -> Dict[str, Dict[str, Dict]]:
    """Fetch all resource data from Firebase"""
    ref = initialize_firebase()
    data = {
        'machines': ref.child('DataQuery/machines').get() or {},
        'materials': ref.child('DataQuery/materials').get() or {},
        'personal': ref.child('DataQuery/personal').get() or {}
    }
    return data

def get_assessment_data() -> Dict[str, Dict]:
    """Fetch all assessment data from Firebase"""
    ref = initialize_firebase()
    assessments = ref.child('Assessments').get() or {}
    return assessments

def _prioritize_assessments_logic() -> Dict:
    """Core logic for prioritizing assessments without assignment"""
    assessments = get_assessments_from_firebase()
    assessed = [a for a in assessments if a.get('status') == 'assessed']
    
    # Check resource availability
    resource_status, assessment_needs = check_resource_availability()
    
    prioritized = {
        'processing': [],
        'on_hold': []
    }
    
    # First, check resource availability for each assessment
    for assessment in assessed:
        assessment_id = assessment['id']
        needs = assessment_needs.get(assessment_id, {})
        
        all_resources_sufficient = True
        for resource_type, resources in needs.get('resources', {}).items():
            for resource_name, quantity in resources.items():
                # Find this resource in the status report
                found = False
                for status in resource_status.get(resource_type, []):
                    if status.resource_name == resource_name:
                        found = True
                        if status.status == 'insufficient':
                            all_resources_sufficient = False
                        break
                
                if not found:
                    all_resources_sufficient = False
        
        if all_resources_sufficient:
            prioritized['processing'].append(assessment)
        else:
            prioritized['on_hold'].append(assessment)
    
    # Sort processing list by locality priority
    def get_locality_priority(locality_type: str) -> int:
        locality_type = locality_type.upper()
        if locality_type == "COMMERCIAL":
            return LocalityPriority.COMMERCIAL.value
        elif locality_type == "INDUSTRIAL":
            return LocalityPriority.INDUSTRIAL.value
        elif locality_type == "MIXED":
            return LocalityPriority.MIXED.value
        else:  # residential or unknown
            return LocalityPriority.RESIDENTIAL.value
    
    prioritized['processing'].sort(key=lambda x: get_locality_priority(x.get('localityType', 'residential')))
    
    # Update the assessments in Firebase with order numbers and status
    order_no = 1
    for assessment in prioritized['processing']:
        update_assessment_order(assessment['id'], order_no, 'processing')
        order_no += 1
    
    for assessment in prioritized['on_hold']:
        update_assessment_order(assessment['id'], 0, 'on_hold')
    
    return prioritized

def assign_resources_to_assessments(prioritized: Dict) -> Dict:
    ref = initialize_firebase()
    resource_data = get_resource_data()
    
    # Debug: Log available resources
    logger.info("Available Resources:")
    logger.info(f"Machines: {[m['id'] for m in resource_data['machines'].values() if m.get('status') == 'active' and m.get('assignedTo') == 'Unassigned']}")
    logger.info(f"Personnel: {[p['id'] for p in resource_data['personal'].values() if p.get('status') == 'active' and p.get('assignedTo') == 'Unassigned']}")

    for assessment in prioritized['processing']:
        assessment_id = assessment['id']
        road_name = assessment.get('roadName', 'Unassigned')
        logger.info(f"Processing assessment {assessment_id} for road {road_name}")
        
        resources_needed = assessment.get('resources', {})
        logger.info(f"Resources needed: {resources_needed}")

        assigned_resources = {'equipment': [], 'labour': []}
        
        # Equipment assignment
        if 'equipment' in resources_needed:
            for machine_type, quantity_needed in resources_needed['equipment'].items():
                logger.info(f"Looking for {quantity_needed} {machine_type}")
                assigned = 0
                for machine_key, machine in resource_data['machines'].items():
                    if (machine.get('type') == machine_type and 
                        machine.get('status') == 'active' and 
                        machine.get('assignedTo') == 'Unassigned'):
                        
                        logger.info(f"Assigning {machine['id']} to {road_name}")
                        ref.child(f'DataQuery/machines/{machine_key}').update({
                            'assignedTo': road_name
                        })
                        assigned_resources['equipment'].append(machine['id'])
                        assigned += 1
                        if assigned >= quantity_needed:
                            break
                
                logger.info(f"Assigned {assigned} of {quantity_needed} {machine_type}")
        
        # Labour assignment
        if 'labour' in resources_needed:
            for role, quantity_needed in resources_needed['labour'].items():
                logger.info(f"Looking for {quantity_needed} {role}")
                assigned = 0
                for person_key, person in resource_data['personal'].items():
                    if (person.get('role') == role and
                        person.get('status') == 'active' and
                        person.get('assignedTo') == 'Unassigned'):
                        
                        logger.info(f"Assigning {person['id']} to {road_name}")
                        ref.child(f'DataQuery/personal/{person_key}').update({
                            'assignedTo': road_name
                        })
                        assigned_resources['labour'].append(person['id'])
                        assigned += 1
                        if assigned >= quantity_needed:
                            break
                
                logger.info(f"Assigned {assigned} of {quantity_needed} {role}")
        
        # Update assessment
        ref.child(f'Assessments/{assessment_id}').update({
            'assignedResources': assigned_resources,
            'assignmentStatus': 'resources_assigned'
        })
        logger.info(f"Completed assignment for {assessment_id}")
    
    return prioritized

def prioritize_assessments():
    """Prioritize assessments and assign resources"""
    try:
        logger.info("Starting prioritize_assessments")
        prioritized = _prioritize_assessments_logic()
        logger.info(f"Found {len(prioritized['processing'])} assessments to process")
        result = assign_resources_to_assessments(prioritized)
        logger.info("Resource assignment completed")
        return result
    except Exception as e:
        logger.error(f"Error in prioritize_assessments: {str(e)}", exc_info=True)
        raise

def check_resource_availability() -> Tuple[Dict[str, List[ResourceStatus]], Dict[str, Dict]]:
    """Compare available resources with assessment requirements"""
    try:
        resource_data = get_resource_data()
        assessment_data = get_assessment_data()
        
        # Initialize resource tracking
        available_resources = {
            'equipment': defaultdict(int),
            'material': defaultdict(int),
            'labour': defaultdict(int)
        }
        
        required_resources = {
            'equipment': defaultdict(int),
            'material': defaultdict(int),
            'labour': defaultdict(int)
        }
        
        # Track which assessments need which resources
        assessment_needs = {}
        
        # Process available resources (only count unassigned resources)
        for machine in resource_data['machines'].values():
            if machine.get('status') == 'active' and machine.get('assignedTo') == 'Unassigned':
                available_resources['equipment'][machine['type']] += 1
        
        for material in resource_data['materials'].values():
            if material.get('status') == 'available':
                available_resources['material'][material['material']] += material.get('quantity', 0)
        
        for person in resource_data['personal'].values():
            if person.get('status') == 'active' and person.get('assignedTo') == 'Unassigned':
                available_resources['labour'][person['role']] += 1
        
        # Process assessment requirements
        for assessment_id, assessment in assessment_data.items():
            if assessment.get('status', '').lower() != 'completed':
                resources = assessment.get('resources', {})
                assessment_needs[assessment_id] = resources
                
                # Sum required resources
                if 'equipment' in resources:
                    for machine_type, quantity in resources['equipment'].items():
                        required_resources['equipment'][machine_type] += quantity
                
                if 'materials' in resources:
                    for material_type, quantity in resources['materials'].items():
                        required_resources['material'][material_type] += quantity
                
                if 'labour' in resources:
                    for role, quantity in resources['labour'].items():
                        required_resources['labour'][role] += quantity
        
        # Generate status reports
        status_reports = defaultdict(list)
        
        # Equipment status
        for machine_type in set(available_resources['equipment']) | set(required_resources['equipment']):
            available = available_resources['equipment'].get(machine_type, 0)
            required = required_resources['equipment'].get(machine_type, 0)
            difference = available - required
            
            status = "sufficient"
            if difference < 0:
                status = "insufficient"
            elif difference > 0 and required == 0:
                status = "excess"
            
            status_reports['equipment'].append(ResourceStatus(
                resource_type="equipment",
                resource_name=machine_type,
                required=required,
                available=available,
                difference=difference,
                status=status
            ))
        
        # Material status (similar logic as equipment)
        # ... [implement similar logic for materials]
        
        # Labour status
        for role in set(available_resources['labour']) | set(required_resources['labour']):
            available = available_resources['labour'].get(role, 0)
            required = required_resources['labour'].get(role, 0)
            difference = available - required
            
            status = "sufficient"
            if difference < 0:
                status = "insufficient"
            elif difference > 0 and required == 0:
                status = "excess"
            
            status_reports['labour'].append(ResourceStatus(
                resource_type="labour",
                resource_name=role,
                required=required,
                available=available,
                difference=difference,
                status=status
            ))
        
        return dict(status_reports), assessment_needs
    
    except Exception as e:
        logger.error(f"Error in check_resource_availability: {str(e)}", exc_info=True)
        return defaultdict(list), {}  # Return empty dicts in case of error

def print_resource_status():
    """Print resource status to console with guaranteed return value"""
    try:
        results, assessment_needs = check_resource_availability()
        prioritized = prioritize_assessments()
        
        print("\n=== Resource Status ===")
        if not results:
            print("  No resource data available")
        else:
            for resource_type, status_list in results.items():
                print(f"\n{resource_type.upper()} STATUS:")
                for status in status_list:
                    if status.status == "insufficient":
                        print(f"  ! SHORTAGE: {status.resource_name} (Need {abs(status.difference)} more)")
                    elif status.status == "excess":
                        print(f"  + EXCESS: {status.resource_name} ({status.available} available, not needed)")
                    else:
                        print(f"  ✓ SUFFICIENT: {status.resource_name} ({status.available} available for {status.required} needed)")
        
        print("\n=== Assessment Priority Status ===")
        if not prioritized:
            print("  No assessment data available")
        else:
            print("\nPROCESSING (in order of priority):")
            for idx, assessment in enumerate(prioritized.get('processing', []), 1):
                print(f"  {idx}. {assessment['id']} - {assessment.get('localityType', 'residential')} - {assessment.get('issueType', 'unknown')}")
            
            print("\nON HOLD (waiting for resources):")
            for idx, assessment in enumerate(prioritized.get('on_hold', []), 1):
                print(f"  {idx}. {assessment['id']} - Missing resources")
        
        return results or {}, prioritized or {'processing': [], 'on_hold': []}
        
    except Exception as e:
        logger.error(f"Status check failed: {str(e)}")
        return {}, {'processing': [], 'on_hold': []}  # Guaranteed return value

def unassign_completed_resources():
    """Unassign resources from completed complaints using roadName"""
    ref = initialize_firebase()
    
    # Get all completed complaints
    complaints = ref.child('Complaints').get()
    completed_complaints = [c for c in complaints.values() if c.get('status', '').lower() == 'completed'] if complaints else []
    
    # Get all assessments
    assessments = ref.child('Assessments').get() or {}
    
    # Get all resources
    resource_data = get_resource_data()
    
    for complaint in completed_complaints:
        complaint_id = complaint.get('id')
        
        # Find matching assessment
        assessment = next((a for a in assessments.values() 
                            if a.get('complaintRef') == complaint_id), None)
        
        if not assessment:
            continue
            
        road_name = assessment.get('roadName', '')  # Get the roadName from assessment
        assigned_resources = assessment.get('assignedResources', {})
        
        # Unassign equipment
        for machine_id in assigned_resources.get('equipment', []):
            for machine_key, machine in resource_data['machines'].items():
                if machine.get('id') == machine_id and machine.get('assignedTo') == road_name:  # Compare with roadName
                    ref.child(f'DataQuery/machines/{machine_key}').update({
                        'assignedTo': 'Unassigned'
                    })
        
        # Unassign personnel
        for person_id in assigned_resources.get('labour', []):
            for person_key, person in resource_data['personal'].items():
                if person.get('id') == person_id and person.get('assignedTo') == road_name:  # Compare with roadName
                    ref.child(f'DataQuery/personal/{person_key}').update({
                        'assignedTo': 'Unassigned'
                    })
        
        logger.info(f"Unassigned resources for completed complaint {complaint_id} on road {road_name}")

