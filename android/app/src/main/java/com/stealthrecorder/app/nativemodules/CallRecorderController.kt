package com.stealthrecorder.app.nativemodules

/**
 * Small in-process bridge between [CallRecorderModule] (the React Native module) and
 * [CallRecorderService] (the foreground service that actually owns the camera).
 *
 * The service runs independently of the Activity so that recording keeps going while the
 * screen is off / the app is in the background. This object lets the JS layer send control
 * commands to the running service and receive lifecycle events back.
 */
object CallRecorderController {
    interface Listener {
        fun onEvent(event: String, uri: String?, durationMs: Long, message: String?)
    }

    @Volatile
    var listener: Listener? = null

    @Volatile
    var service: CallRecorderService? = null

    fun emit(event: String, uri: String? = null, durationMs: Long = 0L, message: String? = null) {
        listener?.onEvent(event, uri, durationMs, message)
    }
}
