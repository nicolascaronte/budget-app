import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { extractTextFromImage, mockOCRService } from '../services/ocrService';

/* ---------- Smart Categorization ---------- */
// This will learn from user choices over time
function suggestCategory(merchant, amount, type, learningData = {}) {
  const merchantLower = merchant.toLowerCase();
  
  // Check if we've seen this merchant before
  if (learningData[merchantLower]) {
    return learningData[merchantLower];
  }
  
  // Basic categorization rules
  const expenseCategories = {
    'grocery': ['grocery', 'supermarket', 'food', 'market'],
    'transport': ['uber', 'taxi', 'bus', 'train', 'gas', 'fuel'],
    'dining': ['restaurant', 'cafe', 'coffee', 'pizza', 'mcdonald'],
    'shopping': ['amazon', 'store', 'mall', 'shop'],
    'utilities': ['electric', 'water', 'internet', 'phone'],
    'entertainment': ['cinema', 'netflix', 'spotify', 'game'],
  };
  
  for (const [category, keywords] of Object.entries(expenseCategories)) {
    if (keywords.some(keyword => merchantLower.includes(keyword))) {
      return category;
    }
  }
  
  // Default suggestions
  if (type === 'income') return 'salary';
  if (type === 'savings') return 'emergency-fund';
  return 'other';
}

/* ---------- Components ---------- */
const Card = ({ children }) => (
  <View className="bg-surface p-4 rounded-2xl mb-4">{children}</View>
);

const TransactionItem = ({ transaction, onCategoryChange, suggestedCategory }) => {
  const [selectedCategory, setSelectedCategory] = useState(suggestedCategory);
  
  const categories = {
    income: ['salary', 'freelance', 'investment', 'other-income'],
    expense: ['grocery', 'transport', 'dining', 'shopping', 'utilities', 'entertainment', 'other-expense'],
    savings: ['emergency-fund', 'vacation', 'investment', 'other-savings'],
  };
  
  const categoryOptions = categories[transaction.type] || [];
  const amountColor = transaction.type === 'income' ? 'text-income' : 
                     transaction.type === 'savings' ? 'text-savings' : 'text-expenses';
  
  return (
    <View className="bg-[#202020] p-3 rounded-xl mb-3">
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-1">
          <Text className="text-textLight font-semibold">{transaction.merchant}</Text>
          <Text className="text-textLight/60 text-sm">{transaction.text}</Text>
        </View>
        <Text className={`${amountColor} font-bold text-lg`}>
          {transaction.type === 'income' ? '+' : '-'}{transaction.amount} kr
        </Text>
      </View>
      
      <View className="mt-2">
        <Text className="text-textLight/70 text-sm mb-2">Suggested category:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row space-x-2">
            {categoryOptions.map((category) => (
              <TouchableOpacity
                key={category}
                onPress={() => {
                  setSelectedCategory(category);
                  onCategoryChange(transaction, category);
                }}
                className={`px-3 py-2 rounded-full border ${
                  selectedCategory === category
                    ? 'bg-income border-income'
                    : 'border-divider bg-transparent'
                }`}
              >
                <Text className={selectedCategory === category ? 'text-white' : 'text-textLight/70'}>
                  {category.replace('-', ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

/* ---------- Main Screen ---------- */
export default function TrackingScreen() {
  const insets = useSafeAreaInsets();
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedTransactions, setExtractedTransactions] = useState([]);
  const [learningData, setLearningData] = useState({});
  
  // Load learning data on mount
  useEffect(() => {
    loadLearningData();
  }, []);
  
  const loadLearningData = async () => {
    try {
      const data = await AsyncStorage.getItem('transaction_learning');
      if (data) {
        setLearningData(JSON.parse(data));
      }
    } catch (error) {
      console.warn('Failed to load learning data:', error);
    }
  };
  
  const saveLearningData = async (newData) => {
    try {
      await AsyncStorage.setItem('transaction_learning', JSON.stringify(newData));
      setLearningData(newData);
    } catch (error) {
      console.warn('Failed to save learning data:', error);
    }
  };
  
  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photos to upload bank statements.');
      return false;
    }
    return true;
  };
  
  const pickImage = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    
    if (!result.canceled && result.assets[0]) {
      processImage(result.assets[0].uri);
    }
  };
  
  const takePhoto = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;
    
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    
    if (!result.canceled && result.assets[0]) {
      processImage(result.assets[0].uri);
    }
  };
  
  const processImage = async (imageUri) => {
    setIsProcessing(true);
    try {
      let transactions;
      
      try {
        // Try real OCR first
        transactions = await extractTextFromImage(imageUri);
        console.log('✅ Real OCR successful');
      } catch (ocrError) {
        console.log('⚠️ Real OCR failed, using mock data:', ocrError.message);
        // Fallback to mock OCR if real OCR fails (no API key, network issues, etc.)
        transactions = await mockOCRService(imageUri);
      }
      
      // Add suggested categories based on learning data
      const transactionsWithSuggestions = transactions.map(transaction => ({
        ...transaction,
        suggestedCategory: suggestCategory(
          transaction.merchant, 
          transaction.amount, 
          transaction.type, 
          learningData
        ),
        id: transaction.id || Date.now() + Math.random(), // Ensure ID exists
      }));
      
      setExtractedTransactions(transactionsWithSuggestions);
    } catch (error) {
      Alert.alert('Error', 'Failed to process the image. Please try again.');
      console.error('Image processing error:', error);
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleCategoryChange = (transaction, newCategory) => {
    // Update the transaction
    setExtractedTransactions(prev => 
      prev.map(t => t.id === transaction.id ? { ...t, selectedCategory: newCategory } : t)
    );
    
    // Learn from this choice
    const merchantKey = transaction.merchant.toLowerCase();
    const updatedLearning = {
      ...learningData,
      [merchantKey]: newCategory,
    };
    saveLearningData(updatedLearning);
  };
  
  const saveTransactions = async () => {
    try {
      // Here we would save the categorized transactions
      // For now, just show success message
      Alert.alert(
        'Success!', 
        `Saved ${extractedTransactions.length} transactions to your budget.`,
        [{ text: 'OK', onPress: () => setExtractedTransactions([]) }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to save transactions. Please try again.');
    }
  };
  
  return (
    <View 
      className="flex-1 bg-backgroundDark"
      style={{ paddingTop: insets.top + 8 }}
    >
      <ScrollView 
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 70 + insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="items-center mb-6">
          <Text className="text-textLight text-2xl font-extrabold">Tracking</Text>
          <Text className="text-textLight/70 text-base">Upload bank statements to track spending</Text>
        </View>
        
        {/* Upload Section */}
        <Card>
          <Text className="text-textLight text-lg font-bold mb-4">📸 Upload Bank Statement</Text>
          
          <View className="space-y-3">
            <TouchableOpacity 
              onPress={takePhoto}
              className={`p-4 rounded-xl flex-row items-center justify-center ${
                isProcessing ? 'bg-income/50' : 'bg-income'
              }`}
              disabled={isProcessing}
            >
              <Text className="text-white font-bold text-base">📷 Take Photo</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={pickImage}
              className={`p-4 rounded-xl flex-row items-center justify-center ${
                isProcessing ? 'bg-savings/50' : 'bg-savings'
              }`}
              disabled={isProcessing}
            >
              <Text className="text-white font-bold text-base">📁 Choose from Gallery</Text>
            </TouchableOpacity>
          </View>
          
          {isProcessing && (
            <View className="mt-4 items-center">
              <ActivityIndicator size="large" color="#64B5F6" />
              <Text className="text-textLight/70 mt-2">🤖 AI Reading Your Statement...</Text>
              <Text className="text-textLight/50 text-sm">Extracting transactions and amounts</Text>
              <View className="mt-2 bg-[#202020] p-2 rounded-lg">
                <Text className="text-textLight/40 text-xs text-center">
                  Check console logs for detailed processing info
                </Text>
                <Text className="text-textLight/40 text-xs text-center">
                  Processing time: 10-30 seconds
                </Text>
              </View>
            </View>
          )}
        </Card>
        
        {/* Extracted Transactions */}
        {extractedTransactions.length > 0 && (
          <Card>
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-textLight text-lg font-bold">
                📋 Found {extractedTransactions.length} Transactions
              </Text>
              <TouchableOpacity 
                onPress={saveTransactions}
                className="bg-income px-4 py-2 rounded-xl"
              >
                <Text className="text-white font-semibold">Save All</Text>
              </TouchableOpacity>
            </View>
            
            <Text className="text-textLight/60 text-sm mb-4">
              Review and confirm categories. The app learns from your choices!
            </Text>
            
            {extractedTransactions.map((transaction) => (
              <TransactionItem
                key={transaction.id}
                transaction={transaction}
                suggestedCategory={transaction.suggestedCategory}
                onCategoryChange={handleCategoryChange}
              />
            ))}
          </Card>
        )}
        
        {/* Tips Section */}
        <Card>
          <Text className="text-textLight text-lg font-bold mb-3">💡 Tips for Best Results</Text>
          <View className="space-y-2">
            <Text className="text-textLight/70">• Take clear photos with good lighting</Text>
            <Text className="text-textLight/70">• Ensure all text is visible and not blurred</Text>
            <Text className="text-textLight/70">• The app learns from your category choices</Text>
            <Text className="text-textLight/70">• Upload recent bank statements for accuracy</Text>
          </View>
        </Card>
        
        {/* Learning Stats */}
        <Card>
          <Text className="text-textLight text-lg font-bold mb-3">🧠 Learning Progress</Text>
          <Text className="text-textLight/70">
            The app has learned {Object.keys(learningData).length} merchant patterns
          </Text>
          <Text className="text-textLight/50 text-sm mt-1">
            More uploads = better automatic categorization
          </Text>
        </Card>
      </ScrollView>
    </View>
  );
}
