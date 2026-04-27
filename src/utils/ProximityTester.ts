// Proximity Sensor Testing Utilities
// Use this for debugging proximity detection on real devices

import { proximityService } from '../services/ProximityService';

export class ProximityTester {
    private logCount = 0;
    private testStartTime = 0;

    startTesting() {
        console.log('🔍 Starting proximity sensor test...');
        this.testStartTime = Date.now();
        this.logCount = 0;

        const testListener = (isNear: boolean) => {
            this.logCount++;
            const elapsed = ((Date.now() - this.testStartTime) / 1000).toFixed(1);
            
            console.log(`📱 [${elapsed}s] Proximity: ${isNear ? '🔴 NEAR EAR' : '🟢 AWAY FROM EAR'} (${this.logCount})`);
            
            if (isNear) {
                console.log('   → Screen should turn OFF');
            } else {
                console.log('   → Screen should turn ON');
            }
        };

        proximityService.addListener(testListener);

        // Auto-stop after 30 seconds
        setTimeout(() => {
            proximityService.removeListener(testListener);
            console.log(`✅ Proximity test completed. Total events: ${this.logCount}`);
        }, 30000);

        return testListener;
    }

    // Call this to manually test proximity states
    logCurrentState() {
        console.log('📊 Proximity Sensor Debug Info:');
        console.log('   - Service active:', proximityService['isActive']);
        console.log('   - Listeners count:', proximityService['listeners'].length);
        console.log('   - Last state:', proximityService['lastProximityState']);
    }
}

export const proximityTester = new ProximityTester();

// Usage in development:
// import { proximityTester } from '../utils/ProximityTester';
// proximityTester.startTesting(); // Start 30-second test
// proximityTester.logCurrentState(); // Check current state