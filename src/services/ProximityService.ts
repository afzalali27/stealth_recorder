import { Platform } from 'react-native';
import { DeviceMotion } from 'expo-sensors';

export interface ProximityListener {
    (isNear: boolean): void;
}

class ProximityService {
    private listeners: ProximityListener[] = [];
    private subscription: { remove: () => void } | null = null;
    private isActive = false;
    private lastProximityState = false;

    start() {
        if (this.isActive || Platform.OS !== 'android') return;

        this.isActive = true;
        DeviceMotion.setUpdateInterval(150);
        
        this.subscription = DeviceMotion.addListener((data) => {
            const isNear = this.detectProximity(data);
            
            if (isNear !== this.lastProximityState) {
                this.lastProximityState = isNear;
                this.notifyListeners(isNear);
            }
        });
    }

    stop() {
        if (!this.isActive) return;
        
        this.isActive = false;
        this.subscription?.remove();
        this.subscription = null;
        this.lastProximityState = false;
    }

    addListener(listener: ProximityListener) {
        this.listeners.push(listener);
        
        // Auto-start when first listener is added
        if (this.listeners.length === 1) {
            this.start();
        }
    }

    removeListener(listener: ProximityListener) {
        this.listeners = this.listeners.filter(l => l !== listener);
        
        // Auto-stop when no listeners remain
        if (this.listeners.length === 0) {
            this.stop();
        }
    }

    private detectProximity(data: any): boolean {
        const rotation = data.rotation;
        const gravity = data.accelerationIncludingGravity;

        if (!rotation || !gravity) return false;

        // Enhanced proximity detection algorithm
        // Phone held in portrait orientation (y-axis gravity dominant)
        const isPortrait = Math.abs(gravity.y ?? 0) > 7.5;
        
        // Phone tilted significantly to the side (ear position)
        // gamma is rotation around z-axis (left/right tilt)
        const isTiltedToEar = Math.abs(rotation.gamma ?? 0) > 1.0 && Math.abs(rotation.gamma ?? 0) < 2.5;
        
        // Phone not lying flat (z-axis gravity should be minimal)
        const isNotFlat = Math.abs(gravity.z ?? 0) < 5.0;
        
        // Additional check: beta rotation should be reasonable (not upside down)
        const isReasonableBeta = Math.abs(rotation.beta ?? 0) < 1.8;

        // Acceleration magnitude check (phone relatively stable near ear)
        const totalAccel = Math.sqrt(
            (gravity.x ?? 0) ** 2 + 
            (gravity.y ?? 0) ** 2 + 
            (gravity.z ?? 0) ** 2
        );
        const isStable = totalAccel > 8.5 && totalAccel < 11.5; // Near 9.8 m/s²

        // All conditions must be true for ear detection
        return isPortrait && isTiltedToEar && isNotFlat && isReasonableBeta && isStable;
    }

    private notifyListeners(isNear: boolean) {
        this.listeners.forEach(listener => {
            try {
                listener(isNear);
            } catch (error) {
                console.warn('Proximity listener error:', error);
            }
        });
    }
}

export const proximityService = new ProximityService();