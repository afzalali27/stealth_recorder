const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withNotificationListener(config) {
    return withAndroidManifest(config, (config) => {
        const mainApplication = config.modResults.manifest.application[0];

        // Ensure the service is declared
        const serviceName = 'com.lesimoes.androidnotificationlistener.RNAndroidNotificationListener';

        // Check if the service already exists
        const services = mainApplication.service || [];
        const serviceExists = services.some(s => s.$['android:name'] === serviceName);

        if (!serviceExists) {
            if (!mainApplication.service) mainApplication.service = [];

            mainApplication.service.push({
                $: {
                    'android:name': serviceName,
                    'android:permission': 'android.permission.BIND_NOTIFICATION_LISTENER_SERVICE',
                    'android:exported': 'true',
                },
                'intent-filter': [
                    {
                        action: [
                            {
                                $: {
                                    'android:name': 'android.service.notification.NotificationListenerService',
                                },
                            },
                        ],
                    },
                ],
            });

            // Also add the headless task service
            mainApplication.service.push({
                $: {
                    'android:name': 'com.lesimoes.androidnotificationlistener.RNAndroidNotificationListenerHeadlessJsTaskService',
                },
            });
        }

        return config;
    });
};
