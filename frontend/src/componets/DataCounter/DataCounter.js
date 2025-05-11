// DataCounter
import { database } from "../../firebase/firebase"; // Adjust path as needed
import { ref, onValue } from "firebase/database";

const DataCounter = () => {
    const countComplaintsByStatus = () => {
        // Initialize counters
        let pendingCount = 0;
        let assessedCount = 0;
        let completedCount = 0;

        // Create reference to Complaints node
    const complaintsRef = ref(database, 'Complaints');
        // Listen for value changes
    onValue(complaintsRef, (snapshot) => {
        // Reset counters on each update
        pendingCount = 0;
        assessedCount = 0;
        completedCount = 0;

    const complaintsData = snapshot.val();

        if (complaintsData) {
            // Iterate through each complaint
            Object.values(complaintsData).forEach(complaint => {
            // Check status and increment appropriate counter
            if (!complaint.status || complaint.status === 'Pending') {
                pendingCount++;
            } else if (complaint.status === 'assessed') {
                assessedCount++;
            } else if (complaint.status === 'completed') {
                completedCount++;
            }
            });
        }

        // Print counts to console
        console.log('Complaint Status Counts:');
        console.log(`Pending: ${pendingCount}`);
        console.log(`Assessed: ${assessedCount}`);
        console.log(`Completed: ${completedCount}`);
        }, (error) => {
        console.error("Error reading complaints data:", error);
        });
    };

    // Start counting when imported/initialized
        countComplaintsByStatus();

    // Optional: Return an object with methods if you want to control when counting happens
        return {
            startCounting: countComplaintsByStatus
        };
    };

    export default DataCounter;