import { ref,get, set, runTransaction, update } from "firebase/database";
import { database } from './firebase';

export const addComplaint = async (complaint) => {
    try {
        // 1. First get/increment the counter
        const counterRef = ref(database, 'counters/complaints');
        const counterSnapshot = await runTransaction(counterRef, (currentCount) => {
            return (currentCount || 0) + 1;
        });
        
        // 2. Get the numeric reference number
        const refNumber = counterSnapshot.snapshot.val();
        const paddedRef = String(refNumber).padStart(3, '0');
        
        // 3. Create today's date in DD-MM-YYYY format
        const today = new Date();
        const day = String(today.getDate()).padStart(2, '0');
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const year = today.getFullYear();
        const dateSubmitted = `${day}-${month}-${year}`;
        
        // 4. Create the complaint with sequential ID
        const newComplaintId = `complaint-${paddedRef}`;
        const complaintRef = ref(database, `Complaints/${newComplaintId}`);
        
        await set(complaintRef, {
            ...complaint,
            id: newComplaintId,
            ref: refNumber,
            dateSubmitted: dateSubmitted  // Changed from 'date' to 'dateSubmitted'
        });
        
        return {
            id: newComplaintId,
            ref: refNumber,
            dateSubmitted: dateSubmitted
        };
    } catch (error) {
        console.error("Error adding complaint: ", error);
        throw error;
    }
};

export const supervisorAssessment = async (complaintRefId, assessmentData) => {
  try {
    // Convert complaintRefId to number if it's a string
    const refNumber = typeof complaintRefId === 'string' 
      ? parseInt(complaintRefId, 10) 
      : complaintRefId;
    
    if (isNaN(refNumber)) {
      throw new Error("Invalid complaint reference ID");
    }

    const paddedRef = String(refNumber).padStart(3, '0');
    const complaintId = `complaint-${paddedRef}`;
    
    // 1. Get the original complaint data
    const complaintRef = ref(database, `Complaints/${complaintId}`);
    const complaintSnapshot = await get(complaintRef);
    
    if (!complaintSnapshot.exists()) {
      throw new Error("Complaint not found");
    }

    const complaintData = complaintSnapshot.val();

    // 2. Prepare resources data
    const formattedResources = {};
    Object.entries(assessmentData.resources).forEach(([type, items]) => {
      formattedResources[type] = items.reduce((acc, item) => {
        acc[item.name] = item.quantity;
        return acc;
      }, {});
    });

    // 3. Create the assessment object
    const today = new Date();
    const assessmentDate = `${String(today.getDate()).padStart(2, '0')}-${
      String(today.getMonth() + 1).padStart(2, '0')}-${
      today.getFullYear()}`;

    const assessment = {
      ...complaintData,
      severityConfirmation: assessmentData.severityConfirmation,
      localityType: assessmentData.localityType,
      repairPriority: assessmentData.repairPriority,
      resources: formattedResources,
      assessmentReport: assessmentData.assessmentReport,
      assessmentDate,
      status: "assessed"
    };

    // 4. Save to Assessments
    const assessmentRef = ref(database, `Assessments/assessment-${paddedRef}`);
    await set(assessmentRef, assessment);

    // 5. Update status in Complaints dataset
    await update(complaintRef, {
      status: "assessed",
      assessmentId: `assessment-${paddedRef}`
    });

    return {
      success: true,
      assessmentId: `assessment-${paddedRef}`
    };

  } catch (error) {
    console.error("Error in supervisor assessment: ", error);
    throw error;
  }
};

