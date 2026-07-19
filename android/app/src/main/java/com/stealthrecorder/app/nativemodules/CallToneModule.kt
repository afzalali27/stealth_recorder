package com.stealthrecorder.app.nativemodules

import android.media.AudioManager
import android.media.ToneGenerator
import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Plays a real, continuously-repeating call ringback tone using Android's native
 * [ToneGenerator]. TONE_SUP_RINGTONE is the telecom supervisory ringback (440+480 Hz,
 * 2s on / 4s off) and repeats until stopped. This is far more reliable than looping a
 * generated WAV through expo-av, which drops the loop when the mic is recording.
 */
class CallToneModule(
    private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

    private var toneGenerator: ToneGenerator? = null

    override fun getName(): String = "CallTone"

    @ReactMethod
    fun start(promise: Promise) {
        try {
            stopInternal()
            // STREAM_MUSIC -> routes to the loudspeaker, matching the "Speaker" button.
            val generator = ToneGenerator(AudioManager.STREAM_MUSIC, 80)
            // TONE_SUP_RINGTONE repeats infinitely until stopTone(); the -1 duration
            // is belt-and-suspenders to request continuous playback.
            val ok = generator.startTone(ToneGenerator.TONE_SUP_RINGTONE, -1)
            toneGenerator = generator
            Log.d("CallTone", "startTone rc=$ok")
            promise.resolve(ok)
        } catch (e: Exception) {
            promise.reject("tone_start_failed", e.message, e)
        }
    }

    @ReactMethod
    fun stop(promise: Promise) {
        stopInternal()
        promise.resolve(true)
    }

    private fun stopInternal() {
        try {
            toneGenerator?.stopTone()
            toneGenerator?.release()
        } catch (_: Exception) {
        }
        toneGenerator = null
    }

    override fun invalidate() {
        stopInternal()
        super.invalidate()
    }
}
