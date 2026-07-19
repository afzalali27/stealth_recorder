package com.stealthrecorder.app.nativemodules

import android.content.Intent
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * React Native bridge to [CallRecorderService]. Exposed to JS as `NativeModules.CallRecorder`.
 * Recording runs inside a foreground service so it survives screen-off / backgrounding.
 */
class CallRecorderModule(
    private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext), CallRecorderController.Listener {

    private var stopPromise: Promise? = null

    init {
        CallRecorderController.listener = this
    }

    override fun getName(): String = "CallRecorder"

    @ReactMethod
    fun start(facing: String, torch: Boolean, promise: Promise) {
        try {
            val intent = Intent(reactContext, CallRecorderService::class.java).apply {
                action = CallRecorderService.ACTION_START
                putExtra(CallRecorderService.EXTRA_FACING, facing)
                putExtra(CallRecorderService.EXTRA_TORCH, torch)
            }
            ContextCompat.startForegroundService(reactContext, intent)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("start_failed", e.message, e)
        }
    }

    @ReactMethod
    fun stop(promise: Promise) {
        val service = CallRecorderController.service
        if (service == null) {
            promise.resolve(null)
            return
        }
        stopPromise = promise
        UiThreadUtil.runOnUiThread { service.stopRecordingInternal() }
    }

    @ReactMethod
    fun setTorch(on: Boolean) {
        CallRecorderController.service?.setTorch(on)
    }

    @ReactMethod
    fun setZoom(zoom: Double) {
        CallRecorderController.service?.setZoom(zoom.toFloat())
    }

    // Required for NativeEventEmitter on the JS side.
    @ReactMethod
    fun addListener(eventName: String) {}

    @ReactMethod
    fun removeListeners(count: Int) {}

    override fun onEvent(event: String, uri: String?, durationMs: Long, message: String?) {
        // Resolve a pending stop() with the finalized file.
        if (event == "finalized" || event == "error") {
            stopPromise?.let { promise ->
                stopPromise = null
                if (event == "finalized") {
                    val result = Arguments.createMap().apply {
                        putString("uri", uri)
                        putDouble("durationMs", durationMs.toDouble())
                    }
                    promise.resolve(result)
                } else {
                    promise.reject("record_error", message ?: "recording_failed")
                }
            }
        }

        // Broadcast every event so JS can react to started/error/finalized regardless of stop().
        try {
            val params = Arguments.createMap().apply {
                putString("event", event)
                uri?.let { putString("uri", it) }
                putDouble("durationMs", durationMs.toDouble())
                message?.let { putString("message", it) }
            }
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit("CallRecorderEvent", params)
        } catch (_: Exception) {
            // React context not ready; ignore.
        }
    }

    override fun invalidate() {
        if (CallRecorderController.listener === this) {
            CallRecorderController.listener = null
        }
        super.invalidate()
    }
}
