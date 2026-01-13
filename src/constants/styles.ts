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
    background: '#000000',      // Pure Void
    surface: '#0D0D0D',         // Bat-Cave Obsidian
    primary: '#9B0000',         // Blood Red / Aggressive
    secondary: '#1A1A1A',       // Stealth Grey
    accent: '#B22222',          // Firebrick
    error: '#FF0000',
    text: '#E0E0E0',            // Ash White
    textSecondary: '#666666',   // Shadow Grey
    border: '#2A2A2A',          // Dark Iron
    batBlue: '#00A3FF',          // Bat-Computer Electric Blue
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

export const FontSize = Typography.sizes;

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
