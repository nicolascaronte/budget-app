/* ============================================================
   COMPONENT STYLE VARIATIONS
   Different styling options for your components
   ============================================================ */

/* ============================================================
   CARD VARIATIONS
   ============================================================ */
const cardStyles = {
  // Your current style
  basic: "bg-surface p-4 rounded-2xl mb-4",
  
  // Glassmorphism with backdrop blur
  glass: "bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl mb-4",
  
  // Elevated with shadow
  elevated: "bg-surface p-4 rounded-2xl mb-4 shadow-lg shadow-black/20",
  
  // With gradient border
  gradientBorder: "bg-surface p-4 rounded-2xl mb-4 border-2 border-gradient-to-r from-income to-savings",
  
  // Neumorphism (soft 3D effect)
  neumorphic: "bg-surface p-4 rounded-2xl mb-4 shadow-inner",
  
  // Minimal flat
  flat: "bg-surface p-4 rounded-xl mb-4 border border-divider/30",
};

/* ============================================================
   BUTTON VARIATIONS
   ============================================================ */
const buttonStyles = {
  // Your current style
  basic: "bg-income p-3 rounded-xl",
  
  // Gradient background
  gradient: "bg-gradient-to-r from-income to-savings p-3 rounded-xl",
  
  // Outlined style
  outline: "border-2 border-income bg-transparent p-3 rounded-xl",
  
  // Pill shaped
  pill: "bg-income px-6 py-3 rounded-full",
  
  // With glow effect
  glow: "bg-income p-3 rounded-xl shadow-lg shadow-income/30",
  
  // Flat minimal
  flat: "bg-income/20 p-3 rounded-xl border border-income/30",
  
  // 3D raised effect
  raised: "bg-income p-3 rounded-xl shadow-lg transform active:scale-95 transition-transform",
};

/* ============================================================
   INPUT VARIATIONS
   ============================================================ */
const inputStyles = {
  // Your current style
  basic: "bg-[#202020] text-textLight p-3 rounded-xl",
  
  // Glassmorphism
  glass: "bg-white/10 backdrop-blur-sm border border-white/20 text-textLight p-3 rounded-xl",
  
  // Underlined only
  underline: "bg-transparent border-b-2 border-divider text-textLight p-3 focus:border-income",
  
  // Outlined
  outline: "bg-transparent border-2 border-divider text-textLight p-3 rounded-xl focus:border-income",
  
  // Soft inset
  inset: "bg-backgroundDark border border-divider/50 text-textLight p-3 rounded-xl shadow-inner",
  
  // Floating label style (requires additional logic)
  floating: "bg-surface border border-divider text-textLight p-3 rounded-xl relative",
};

/* ============================================================
   SECTION HEADER VARIATIONS
   ============================================================ */
const headerStyles = {
  // Your current style
  basic: "text-income text-lg font-bold mb-3",
  
  // With background and icon
  enhanced: "flex items-center bg-income/10 text-income text-lg font-bold p-3 rounded-xl mb-3",
  
  // Underlined
  underlined: "text-income text-lg font-bold mb-3 border-b-2 border-income/30 pb-2",
  
  // Gradient text
  gradient: "bg-gradient-to-r from-income to-savings bg-clip-text text-transparent text-lg font-bold mb-3",
  
  // With side accent
  accented: "text-income text-lg font-bold mb-3 border-l-4 border-income pl-3",
  
  // Pill style
  pill: "bg-income/20 text-income text-lg font-bold px-4 py-2 rounded-full mb-3 self-start",
};

/* ============================================================
   USAGE EXAMPLES
   ============================================================ */
const usageExamples = `
// Using different card styles
<View className="${cardStyles.glass}">
<View className="${cardStyles.elevated}">

// Different button styles
<TouchableOpacity className="${buttonStyles.gradient}">
<TouchableOpacity className="${buttonStyles.outline}">

// Input variations
<TextInput className="${inputStyles.glass}" />
<TextInput className="${inputStyles.underline}" />

// Header styles
<Text className="${headerStyles.gradient}">Income</Text>
<Text className="${headerStyles.accented}">Expenses</Text>
`;

module.exports = {
  cardStyles,
  buttonStyles,
  inputStyles,
  headerStyles,
  usageExamples,
};
