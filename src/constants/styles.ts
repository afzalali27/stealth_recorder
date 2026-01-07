// Shared styles and theme constants

export const Colors = {
    // Android call interface colors
    callBackground: '#1a1a1a',
    callPrimary: '#00C853',
    callDanger: '#FF1744',
    callSecondary: '#424242',
    callText: '#FFFFFF',
    callTextSecondary: '#B0B0B0',
    callAccent: '#2196F3',

    // App colors
    background: '#000000',
    surface: '#1E1E1E',
    primary: '#4CAF50',
    secondary: '#757575',
    accent: '#03A9F4',
    error: '#F44336',
    text: '#FFFFFF',
    textSecondary: '#9E9E9E',
    border: '#424242',
};

export const Typography = {
    sizes: {
        xs: 12,
        sm: 14,
        md: 16,
        lg: 18,
        xl: 20,
        xxl: 24,
        huge: 32,
    },
    weights: {
        regular: '400' as const,
        medium: '500' as const,
        semibold: '600' as const,
        bold: '700' as const,
    },
};

export const Spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
};

export const BorderRadius = {
    sm: 4,
    md: 8,
    lg: 16,
    xl: 24,
    round: 9999,
};

export const Layout = {
    screenPadding: 16,
    buttonHeight: 56,
    inputHeight: 48,
};
