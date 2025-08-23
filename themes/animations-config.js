/* ============================================================
   ENHANCED ANIMATIONS CONFIG
   Add these to any theme's extend section
   ============================================================ */

const animationsConfig = {
  animation: {
    'fade-in': 'fadeIn 0.3s ease-in-out',
    'slide-up': 'slideUp 0.3s ease-out',
    'bounce-gentle': 'bounceGentle 0.6s ease-out',
    'pulse-soft': 'pulseSoft 2s infinite',
    'glow': 'glow 2s ease-in-out infinite alternate',
    'scale-in': 'scaleIn 0.2s ease-out',
    'shake': 'shake 0.5s ease-in-out',
  },
  keyframes: {
    fadeIn: {
      '0%': { opacity: '0' },
      '100%': { opacity: '1' },
    },
    slideUp: {
      '0%': { transform: 'translateY(20px)', opacity: '0' },
      '100%': { transform: 'translateY(0)', opacity: '1' },
    },
    bounceGentle: {
      '0%, 20%, 50%, 80%, 100%': { transform: 'translateY(0)' },
      '40%': { transform: 'translateY(-4px)' },
      '60%': { transform: 'translateY(-2px)' },
    },
    pulseSoft: {
      '0%, 100%': { opacity: '1' },
      '50%': { opacity: '0.7' },
    },
    glow: {
      '0%': { boxShadow: '0 0 5px currentColor' },
      '100%': { boxShadow: '0 0 20px currentColor, 0 0 30px currentColor' },
    },
    scaleIn: {
      '0%': { transform: 'scale(0.9)', opacity: '0' },
      '100%': { transform: 'scale(1)', opacity: '1' },
    },
    shake: {
      '0%, 100%': { transform: 'translateX(0)' },
      '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-2px)' },
      '20%, 40%, 60%, 80%': { transform: 'translateX(2px)' },
    },
  },
};

/* ============================================================
   USAGE EXAMPLES IN COMPONENTS
   ============================================================ */

const usageExamples = `
// Fade in cards when they appear
<Card className="animate-fade-in">

// Slide up modal from bottom
<Modal className="animate-slide-up">

// Gentle bounce on button press
<TouchableOpacity className="active:animate-bounce-gentle">

// Soft pulse on loading states
<Text className="animate-pulse-soft">Loading...</Text>

// Glow effect on focused inputs
<TextInput className="focus:animate-glow">

// Scale in when item is added
<View className="animate-scale-in">

// Shake on validation error
<TextInput className="animate-shake">
`;

module.exports = { animationsConfig, usageExamples };
