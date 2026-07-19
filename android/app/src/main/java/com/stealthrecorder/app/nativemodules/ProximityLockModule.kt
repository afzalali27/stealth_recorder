package com.stealthrecorder.app.nativemodules

import android.annotation.SuppressLint
import android.content.Context
import android.os.PowerManager
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Turns the screen off when the phone is held to the ear during a call — the same mechanism
 * real dialers use. Uses [PowerManager.PROXIMITY_SCREEN_OFF_WAKE_LOCK], which lets the OS
 * hardware-off the display (and touch) based on the proximity sensor. This replaces the old,
 * unreliable accelerometer-based heuristic + fake black overlay.
 */
class ProximityLockModule(
    private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

    private var wakeLock: PowerManager.WakeLock? = null

    override fun getName(): String = "ProximityLock"

    private fun powerManager(): PowerManager =
        reactContext.getSystemService(Context.POWER_SERVICE) as PowerManager

    @ReactMethod
    fun isAvailable(promise: Promise) {
        try {
            val supported = powerManager()
                .isWakeLockLevelSupported(PowerManager.PROXIMITY_SCREEN_OFF_WAKE_LOCK)
            promise.resolve(supported)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @SuppressLint("WakelockTimeout")
    @ReactMethod
    fun activate(promise: Promise) {
        try {
            val pm = powerManager()
            if (!pm.isWakeLockLevelSupported(PowerManager.PROXIMITY_SCREEN_OFF_WAKE_LOCK)) {
                promise.resolve(false)
                return
            }
            if (wakeLock == null) {
                wakeLock = pm.newWakeLock(
                    PowerManager.PROXIMITY_SCREEN_OFF_WAKE_LOCK,
                    "BatEye:proximity"
                ).apply { setReferenceCounted(false) }
            }
            if (wakeLock?.isHeld != true) {
                wakeLock?.acquire()
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("proximity_activate_failed", e.message, e)
        }
    }

    @ReactMethod
    fun deactivate(promise: Promise) {
        try {
            if (wakeLock?.isHeld == true) {
                wakeLock?.release(PowerManager.RELEASE_FLAG_WAIT_FOR_NO_PROXIMITY)
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    override fun invalidate() {
        try {
            if (wakeLock?.isHeld == true) wakeLock?.release()
        } catch (_: Exception) {
        }
        wakeLock = null
        super.invalidate()
    }
}
