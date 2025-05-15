const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.syncComplaintStatus = functions.database.ref('/Complaints/{complaintId}/status')
  .onUpdate(async (change, context) => {
    const newStatus = change.after.val();
    const complaintId = context.params.complaintId;
    
    if (newStatus === 'completed') {
      // Find the corresponding assessment
        const assessmentsRef = admin.database().ref('Assessments');
        const snapshot = await assessmentsRef
            .orderByChild('complaintRef')
            .equalTo(complaintId)
            .once('value');
        
        if (snapshot.exists()) {
        const assessmentData = snapshot.val();
        const assessmentId = Object.keys(assessmentData)[0];
        
        // Update the assessment status
        return admin.database()
            .ref(`Assessments/${assessmentId}/status`)
            .set('completed');
        }
    }
    
    return null;
  });

// You can add more functions here as needed