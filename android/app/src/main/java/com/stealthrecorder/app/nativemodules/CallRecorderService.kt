package com.stealthrecorder.app.nativemodules

import android.annotation.SuppressLint
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.util.Log
import androidx.camera.core.Camera
import androidx.camera.core.CameraSelector
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.video.FallbackStrategy
import androidx.camera.video.FileOutputOptions
import androidx.camera.video.Quality
import androidx.camera.video.QualitySelector
import androidx.camera.video.Recorder
import androidx.camera.video.Recording
import androidx.camera.video.VideoCapture
import androidx.camera.video.VideoRecordEvent
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.LifecycleRegistry
import java.io.File

/**
 * Foreground service that owns a CameraX recording session bound to its OWN lifecycle
 * (a [LifecycleRegistry] we drive manually) instead of the Activity's. Because the camera is
 * bound to a service-scoped lifecycle, recording continues when the user presses the power
 * button / the screen locks / the app is backgrounded — which the Activity-bound expo-camera
 * path could not do.
 */
class CallRecorderService : Service(), LifecycleOwner {

    private val lifecycleRegistry = LifecycleRegistry(this)
    override val lifecycle: Lifecycle get() = lifecycleRegistry

    private val mainHandler = Handler(Looper.getMainLooper())

    private var cameraProvider: ProcessCameraProvider? = null
    private var videoCapture: VideoCapture<Recorder>? = null
    private var recording: Recording? = null
    private var camera: Camera? = null
    private var wakeLock: PowerManager.WakeLock? = null

    private var outputFile: File? = null
    private var lensFacing = CameraSelector.LENS_FACING_BACK
    private var startedAtMs = 0L
    private var stopping = false

    companion object {
        const val ACTION_START = "com.stealthrecorder.app.CALL_RECORDER_START"
        const val ACTION_STOP = "com.stealthrecorder.app.CALL_RECORDER_STOP"
        const val EXTRA_FACING = "facing"
        const val EXTRA_TORCH = "torch"

        private const val CHANNEL_ID = "call_recorder_channel"
        private const val NOTIFICATION_ID = 4711
        private const val TAG = "CallRecorderService"
    }

    override fun onCreate() {
        super.onCreate()
        lifecycleRegistry.currentState = Lifecycle.State.CREATED
        CallRecorderController.service = this
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_STOP -> {
                stopRecordingInternal()
                return START_NOT_STICKY
            }
            else -> {
                lensFacing = if (intent?.getStringExtra(EXTRA_FACING) == "front") {
                    CameraSelector.LENS_FACING_FRONT
                } else {
                    CameraSelector.LENS_FACING_BACK
                }
                val torch = intent?.getBooleanExtra(EXTRA_TORCH, false) ?: false
                startAsForeground()
                acquireWakeLock()
                lifecycleRegistry.currentState = Lifecycle.State.RESUMED
                startCamera(torch)
            }
        }
        return START_STICKY
    }

    private fun startCamera(torch: Boolean) {
        val future = ProcessCameraProvider.getInstance(this)
        future.addListener({
            try {
                val provider = future.get()
                cameraProvider = provider

                val recorder = Recorder.Builder()
                    .setQualitySelector(
                        QualitySelector.from(
                            Quality.HD,
                            FallbackStrategy.higherQualityOrLowerThan(Quality.SD)
                        )
                    )
                    .build()
                val capture = VideoCapture.withOutput(recorder)
                videoCapture = capture

                val selector = CameraSelector.Builder().requireLensFacing(lensFacing).build()
                provider.unbindAll()
                camera = provider.bindToLifecycle(this, selector, capture)

                if (torch && camera?.cameraInfo?.hasFlashUnit() == true) {
                    camera?.cameraControl?.enableTorch(true)
                }

                beginRecording(capture)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to start camera", e)
                CallRecorderController.emit("error", message = e.message ?: "camera_start_failed")
                cleanupAndStop()
            }
        }, ContextCompat.getMainExecutor(this))
    }

    @SuppressLint("MissingPermission")
    private fun beginRecording(capture: VideoCapture<Recorder>) {
        val dir = File(filesDir, "callrecorder").apply { mkdirs() }
        val file = File(dir, "rec_${System.currentTimeMillis()}.mp4")
        outputFile = file

        val options = FileOutputOptions.Builder(file).build()
        var pending = capture.output.prepareRecording(this, options)
        if (hasPermission(android.Manifest.permission.RECORD_AUDIO)) {
            pending = pending.withAudioEnabled()
        }

        startedAtMs = System.currentTimeMillis()
        recording = pending.start(ContextCompat.getMainExecutor(this)) { event ->
            when (event) {
                is VideoRecordEvent.Start -> CallRecorderController.emit("started")
                is VideoRecordEvent.Finalize -> {
                    val durationMs = System.currentTimeMillis() - startedAtMs
                    val hasFile = outputFile?.let { it.exists() && it.length() > 0 } ?: false
                    if (event.hasError() && !hasFile) {
                        Log.e(TAG, "Recording finalize error: ${event.error}")
                        CallRecorderController.emit("error", message = "record_error_${event.error}")
                    } else {
                        val uri = "file://" + (outputFile?.absolutePath ?: "")
                        CallRecorderController.emit("finalized", uri = uri, durationMs = durationMs)
                    }
                    cleanupAndStop()
                }
                else -> {}
            }
        }
    }

    fun setTorch(on: Boolean) {
        mainHandler.post {
            val hasFlash = camera?.cameraInfo?.hasFlashUnit() == true
            camera?.cameraControl?.enableTorch(on && hasFlash)
        }
    }

    fun setZoom(linear: Float) {
        mainHandler.post {
            camera?.cameraControl?.setLinearZoom(linear.coerceIn(0f, 1f))
        }
    }

    fun stopRecordingInternal() {
        if (stopping) return
        stopping = true
        mainHandler.post {
            val current = recording
            if (current != null) {
                recording = null
                current.stop() // triggers VideoRecordEvent.Finalize -> cleanupAndStop()
            } else {
                cleanupAndStop()
            }
        }
    }

    private fun cleanupAndStop() {
        try {
            cameraProvider?.unbindAll()
        } catch (e: Exception) {
            Log.w(TAG, "unbindAll failed", e)
        }
        camera = null
        releaseWakeLock()
        stopForegroundCompat()
        stopSelf()
    }

    private fun startAsForeground() {
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Call",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                setShowBadge(false)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
            }
            manager.createNotificationChannel(channel)
        }

        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        val contentIntent = launchIntent?.let {
            PendingIntent.getActivity(
                this,
                0,
                it,
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M)
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                else
                    PendingIntent.FLAG_UPDATE_CURRENT
            )
        }

        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Ongoing call")
            .setContentText("Tap to return to the call")
            .setSmallIcon(android.R.drawable.stat_sys_phone_call)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setContentIntent(contentIntent)
            .build()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            var type = ServiceInfo.FOREGROUND_SERVICE_TYPE_CAMERA
            if (hasPermission(android.Manifest.permission.RECORD_AUDIO)) {
                type = type or ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE
            }
            startForeground(NOTIFICATION_ID, notification, type)
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    private fun stopForegroundCompat() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                stopForeground(STOP_FOREGROUND_REMOVE)
            } else {
                @Suppress("DEPRECATION")
                stopForeground(true)
            }
        } catch (e: Exception) {
            Log.w(TAG, "stopForeground failed", e)
        }
    }

    private fun acquireWakeLock() {
        if (wakeLock?.isHeld == true) return
        val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "BatEye:recording").apply {
            setReferenceCounted(false)
            acquire(60 * 60 * 1000L) // safety cap: 1 hour
        }
    }

    private fun releaseWakeLock() {
        try {
            if (wakeLock?.isHeld == true) wakeLock?.release()
        } catch (e: Exception) {
            Log.w(TAG, "releaseWakeLock failed", e)
        }
        wakeLock = null
    }

    private fun hasPermission(permission: String): Boolean =
        ContextCompat.checkSelfPermission(this, permission) == PackageManager.PERMISSION_GRANTED

    override fun onDestroy() {
        releaseWakeLock()
        try {
            cameraProvider?.unbindAll()
        } catch (e: Exception) {
            Log.w(TAG, "onDestroy unbind failed", e)
        }
        lifecycleRegistry.currentState = Lifecycle.State.DESTROYED
        if (CallRecorderController.service === this) {
            CallRecorderController.service = null
        }
        super.onDestroy()
    }
}
