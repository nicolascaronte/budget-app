import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { parseUniversalBankStatement } from './universalBankParser';

/* ============================================================
   IMPROVED OCR SERVICE WITH MULTIPLE OPTIONS
   Real text extraction from bank statement photos
   ============================================================ */

// Option 1: Google Vision API (requires API key)
const GOOGLE_VISION_API_KEY = 'AIzaSyCyHtIbSBEuWUXG3wGIVu14GS7KGLtRcTg'; // Replace with your actual API key

// Option 2: Alternative free OCR service
const OCR_SPACE_API_KEY = 'helloworld'; // Free tier available

/**
 * Preprocess image for better OCR results
 */
async function preprocessImage(imageUri) {
  try {
    const manipulatedImage = await ImageManipulator.manipulateAsync(
      imageUri,
      [
        { resize: { width: 1000 } }, // Resize for better processing
        { rotate: 0 }, // Ensure correct orientation
      ],
      { 
        compress: 0.8, 
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true 
      }
    );
    return manipulatedImage;
  } catch (error) {
    console.error('Image preprocessing error:', error);
    throw error;
  }
}

/**
 * Extract text using OCR.space API (Free tier available)
 * @param {string} imageUri - Local image URI
 * @returns {Promise<Array>} - Array of extracted transactions
 */
async function extractWithOCRSpace(imageUri) {
  try {
    const processedImage = await preprocessImage(imageUri);
    
    const formData = new FormData();
    formData.append('base64Image', `data:image/jpeg;base64,${processedImage.base64}`);
    formData.append('language', 'eng');
    formData.append('isOverlayRequired', 'false');
    formData.append('detectOrientation', 'true');
    formData.append('scale', 'true');
    formData.append('OCREngine', '2'); // Use newer engine
    
    const response = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: {
        'apikey': OCR_SPACE_API_KEY,
      },
      body: formData,
    });
    
    const result = await response.json();
    
    if (result.ParsedResults && result.ParsedResults[0] && result.ParsedResults[0].ParsedText) {
      const extractedText = result.ParsedResults[0].ParsedText;
      console.log('📄 Extracted text:', extractedText);
      return parseUniversalBankStatement(extractedText);
    } else {
      throw new Error('No text found in image');
    }
  } catch (error) {
    console.error('OCR.space Error:', error);
    throw error;
  }
}

/**
 * Extract text from image using Google Vision API
 * @param {string} imageUri - Local image URI
 * @returns {Promise<Array>} - Array of extracted transactions
 */
async function extractWithGoogleVision(imageUri) {
  if (GOOGLE_VISION_API_KEY === 'YOUR_API_KEY_HERE') {
    throw new Error('Google Vision API key not configured');
  }
  
  console.log('🔑 Using Google Vision API key:', GOOGLE_VISION_API_KEY.substring(0, 10) + '...');
  
  try {
    const processedImage = await preprocessImage(imageUri);
    console.log('📷 Image preprocessed successfully');

    // Call Google Vision API
    console.log('📡 Calling Google Vision API...');
    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              image: {
                content: processedImage.base64,
              },
              features: [
                {
                  type: 'TEXT_DETECTION',
                  maxResults: 50,
                },
              ],
            },
          ],
        }),
      }
    );

    console.log('📊 Google Vision response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Google Vision API error response:', errorText);
      throw new Error(`Google Vision API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('📋 Google Vision result:', JSON.stringify(result, null, 2));
    
    if (result.responses && result.responses[0]) {
      const response_data = result.responses[0];
      
      // Check for errors in response
      if (response_data.error) {
        console.error('❌ Google Vision API returned error:', response_data.error);
        throw new Error(`Google Vision error: ${response_data.error.message}`);
      }
      
      if (response_data.textAnnotations && response_data.textAnnotations.length > 0) {
        const extractedText = response_data.textAnnotations[0].description;
        console.log('📄 Google Vision extracted text:', extractedText);
        return parseUniversalBankStatement(extractedText);
      } else {
        console.log('⚠️ No text annotations found in Google Vision response');
        throw new Error('No text found in image');
      }
    } else {
      console.log('⚠️ Invalid Google Vision response structure');
      throw new Error('Invalid response from Google Vision');
    }
  } catch (error) {
    console.error('Google Vision Error:', error);
    throw error;
  }
}

/**
 * Main OCR function - tries multiple services
 * @param {string} imageUri - Local image URI
 * @returns {Promise<Array>} - Array of extracted transactions
 */
export async function extractTextFromImage(imageUri) {
  console.log('🔍 Starting OCR process with image:', imageUri);
  console.log('🔑 API Key check:', GOOGLE_VISION_API_KEY.substring(0, 20) + '...');
  
  // FORCE Google Vision API usage (most accurate)
  try {
    console.log('📡 Calling Google Vision API...');
    const transactions = await extractWithGoogleVision(imageUri);
    console.log('✅ Google Vision successful!');
    return transactions;
  } catch (error) {
    console.log('❌ Google Vision failed:', error.message);
    console.log('🔍 Full error:', error);
    
    // Check specific error types
    if (error.message.includes('API key not configured')) {
      console.log('💡 API key issue detected');
    } else if (error.message.includes('403')) {
      console.log('💡 Permission issue - check if Vision API is enabled');
    } else if (error.message.includes('400')) {
      console.log('💡 Request format issue');
    }
    
    // Temporary fallback while you enable Vision API
    console.log('🔄 Falling back to OCR.space while you enable Vision API...');
    
    try {
      const transactions = await extractWithOCRSpace(imageUri);
      if (transactions.length > 0) {
        console.log('✅ OCR.space backup successful!');
        return transactions;
      }
    } catch (backupError) {
      console.log('❌ Backup OCR also failed:', backupError.message);
    }
    
    throw new Error(`All OCR failed. Enable Vision API to fix this.`);
  }
}

/**
 * Parse transactions from extracted text
 * @param {string} text - Raw text from OCR
 * @returns {Array} - Parsed transactions
 */
function parseTransactionsFromText(text) {
  console.log('🔍 Parsing Norwegian bank statement...');
  console.log('📄 Raw text to parse:', text);
  
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  const transactions = [];
  
  console.log(`📝 Processing ${lines.length} lines...`);
  
  // Your bank statement format appears to be:
  // Day Date
  // MERCHANT NAME, Location...
  // Category
  // -Amount
  
  for (let i = 0; i < lines.length; i++) {
    const currentLine = lines[i].trim();
    
    console.log(`Line ${i}: "${currentLine}"`);
    
    // Look for amount lines (negative numbers)
    const amountMatch = currentLine.match(/^([\-\+]?\s*\d{1,3}(?:[\s\.,]\d{3})*[,\.]?\d{0,2})$/);
    
    if (amountMatch) {
      const amountStr = amountMatch[1];
      const amount = parseAmount(amountStr);
      
      console.log(`💰 Found amount: ${amountStr} -> ${amount}`);
      
      if (amount >= 1) {
        // Look backwards for merchant name
        let merchant = '';
        let category = '';
        
        // Check previous lines for merchant info
        for (let j = i - 1; j >= Math.max(0, i - 4); j--) {
          const checkLine = lines[j]?.trim();
          if (!checkLine) continue;
          
          console.log(`  Checking line ${j}: "${checkLine}"`);
          
          // Skip date lines
          if (isDateLine(checkLine)) {
            console.log(`  -> Skipping date line`);
            continue;
          }
          
          // Skip amount lines
          if (checkLine.match(/^[\-\+]?\s*\d/)) {
            console.log(`  -> Skipping amount line`);
            continue;
          }
          
          // This should be merchant or category
          if (checkLine.length > 2) {
            if (!merchant) {
              // First non-date/amount line is likely the merchant
              merchant = checkLine;
              console.log(`  -> Found merchant: "${merchant}"`);
            } else if (!category && checkLine.length < 30) {
              // Short line might be category
              category = checkLine;
              console.log(`  -> Found category: "${category}"`);
            }
          }
        }
        
        if (merchant) {
          const cleanMerchant = extractMerchantName(merchant);
          const type = determineTransactionType(cleanMerchant, amount, merchant + ' ' + category);
          
          transactions.push({
            text: `${merchant} ${currentLine}`,
            merchant: cleanMerchant,
            amount: amount,
            type: type,
            category: category || 'Other',
            id: Date.now() + Math.random() + i,
          });
          
          console.log(`✅ Transaction: ${cleanMerchant} - ${amount} kr (${type}) [${category}]`);
        } else {
          console.log(`❌ No merchant found for amount ${amount}`);
        }
      }
    }
  }
  
  console.log(`🎯 Found ${transactions.length} transactions total`);
  
  // Remove duplicates and sort by amount
  const uniqueTransactions = removeDuplicates(transactions);
  return uniqueTransactions.sort((a, b) => b.amount - a.amount);
}

/**
 * Check if line contains a date
 */
function isDateLine(line) {
  return /\b(mandag|tirsdag|onsdag|torsdag|fredag|lørdag|søndag|\d{1,2}\.\d{1,2}\.\d{2,4})/i.test(line);
}

/**
 * Clean up merchant name (Norwegian format)
 */
function extractMerchantName(rawMerchant) {
  if (!rawMerchant) return '';
  
  console.log(`🏪 Cleaning merchant: "${rawMerchant}"`);
  
  let cleaned = rawMerchant
    .replace(/\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/g, '') // Remove dates
    .replace(/[\-\+]?\d+[,\.]?\d*/g, '') // Remove amounts
    .replace(/,\s*[A-Z][a-z]+/g, '') // Remove location after comma (e.g., ", Trondheim")
    .replace(/\*\s*/g, '') // Remove asterisks
    .replace(/\.\.\./g, '') // Remove ellipsis
    .replace(/[^\w\sæøåÆØÅ]/g, ' ') // Keep Norwegian characters
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
  
  // Take first part if very long (remove location/description)
  if (cleaned.length > 25) {
    const parts = cleaned.split(/\s+/);
    cleaned = parts.slice(0, 3).join(' '); // Take first 3 words
  }
  
  const result = cleaned.toUpperCase();
  console.log(`🏪 Result: "${result}"`);
  
  return result;
}

/**
 * Parse amount from string (handles Norwegian formats)
 */
function parseAmount(amountStr) {
  if (!amountStr) return 0;
  
  console.log(`🔢 Parsing amount: "${amountStr}"`);
  
  let cleaned = String(amountStr).trim();
  
  // Remove currency symbols and extra text
  cleaned = cleaned.replace(/kr|nok|øre/gi, '').trim();
  
  // Handle Norwegian formats specifically:
  // -274,71 -> 274.71
  // -4 349.00 -> 4349.00
  // -111,00 -> 111.00
  
  // Remove leading/trailing spaces and signs
  const isNegative = cleaned.startsWith('-') || cleaned.startsWith('+');
  cleaned = cleaned.replace(/^[\-\+\s]+/, '').replace(/\s+$/, '');
  
  console.log(`🧹 Cleaned: "${cleaned}"`);
  
  // Check if it has comma as decimal separator (Norwegian style)
  if (cleaned.includes(',') && !cleaned.includes('.')) {
    // Format: 274,71 or 4 349,00
    cleaned = cleaned.replace(/\s/g, '').replace(',', '.');
  } 
  // Check if it has space as thousand separator
  else if (cleaned.includes(' ')) {
    // Format: 4 349.00 or 4 349,00
    const parts = cleaned.split(/[,\.]/);
    if (parts.length === 2 && parts[1].length <= 2) {
      // Has decimal part
      cleaned = cleaned.replace(/\s/g, '').replace(',', '.');
    } else {
      // No decimal, just remove spaces
      cleaned = cleaned.replace(/\s/g, '');
    }
  }
  
  console.log(`🔧 Final cleaned: "${cleaned}"`);
  
  const num = parseFloat(cleaned);
  const result = isNaN(num) ? 0 : Math.abs(num);
  
  console.log(`➡️ Result: ${result}`);
  
  return result;
}

/**
 * Determine if transaction is income, expense, or savings
 */
function determineTransactionType(merchant, amount, fullText) {
  const merchantLower = merchant.toLowerCase();
  const textLower = fullText.toLowerCase();
  
  // Income indicators
  const incomeKeywords = ['salary', 'wage', 'deposit', 'refund', 'transfer in', 'payment received'];
  if (incomeKeywords.some(keyword => textLower.includes(keyword))) {
    return 'income';
  }
  
  // Savings indicators
  const savingsKeywords = ['savings', 'investment', 'pension', 'transfer to'];
  if (savingsKeywords.some(keyword => textLower.includes(keyword))) {
    return 'savings';
  }
  
  // Default to expense
  return 'expense';
}

/**
 * Remove duplicate transactions
 */
function removeDuplicates(transactions) {
  const seen = new Set();
  return transactions.filter(transaction => {
    const key = `${transaction.merchant}-${transaction.amount}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

/* ============================================================
   FALLBACK OCR SERVICE (for testing without API key)
   ============================================================ */

/**
 * Enhanced mock OCR service with more realistic data
 */
export function mockOCRService(imageUri) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const mockTransactions = [
        { 
          text: '15.01.2024 REMA 1000 OSLO -287.50', 
          amount: 287.50, 
          merchant: 'REMA 1000 OSLO', 
          type: 'expense',
          id: Date.now() + 1
        },
        { 
          text: '15.01.2024 SALARY DEPOSIT +32500.00', 
          amount: 32500.00, 
          merchant: 'SALARY DEPOSIT', 
          type: 'income',
          id: Date.now() + 2
        },
        { 
          text: '14.01.2024 COFFEE SHOP DOWNTOWN -85.00', 
          amount: 85.00, 
          merchant: 'COFFEE SHOP DOWNTOWN', 
          type: 'expense',
          id: Date.now() + 3
        },
        { 
          text: '14.01.2024 TRANSFER TO SAVINGS -2500.00', 
          amount: 2500.00, 
          merchant: 'TRANSFER TO SAVINGS', 
          type: 'savings',
          id: Date.now() + 4
        },
        { 
          text: '13.01.2024 NETFLIX SUBSCRIPTION -149.00', 
          amount: 149.00, 
          merchant: 'NETFLIX SUBSCRIPTION', 
          type: 'expense',
          id: Date.now() + 5
        },
        { 
          text: '12.01.2024 UBER RIDE -125.50', 
          amount: 125.50, 
          merchant: 'UBER RIDE', 
          type: 'expense',
          id: Date.now() + 6
        },
      ];
      resolve(mockTransactions);
    }, 2500); // Slightly longer to feel more realistic
  });
}

/* ============================================================
   USAGE INSTRUCTIONS
   ============================================================ */

/*
TO USE REAL OCR:

1. Get Google Vision API key:
   - Go to https://console.cloud.google.com/
   - Create new project or select existing
   - Enable Vision API
   - Create credentials (API key)
   - Replace GOOGLE_VISION_API_KEY above

2. Update TrackingScreen.js:
   - Replace: mockOCRService(imageUri)
   - With: extractTextFromImage(imageUri)

3. Test with real bank statements:
   - Take clear, well-lit photos
   - Ensure text is readable
   - The service will extract actual transaction data

SECURITY NOTE:
- Store API key in environment variables in production
- Consider using Firebase Functions for server-side OCR
- Never commit API keys to version control
*/
