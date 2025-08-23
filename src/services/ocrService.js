import * as ImageManipulator from 'expo-image-manipulator';
import { parseUniversalBankStatement } from './universalBankParser';

/* ============================================================
   GOOGLE VISION OCR SERVICE
   Real text extraction from bank statement photos using Google Vision API
   ============================================================ */

// Google Vision API configuration
const GOOGLE_VISION_API_KEY = 'AIzaSyCyHtIbSBEuWUXG3wGIVu14GS7KGLtRcTg'; // Replace with your actual API key

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
        console.log('📄 Google Vision extracted text:');
        console.log('====== RAW OCR OUTPUT ======');
        console.log(extractedText);
        console.log('====== END OCR OUTPUT ======');
        
        // Show each line with index for debugging
        const lines = extractedText.split('\n');
        console.log('📝 OCR Lines breakdown:');
        lines.forEach((line, i) => {
          console.log(`Line ${i}: "${line}"`);
        });
        
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
 * Extract text from image using Google Vision API
 * @param {string} imageUri - Local image URI
 * @returns {Promise<Array>} - Array of extracted transactions
 */
export async function extractTextFromImage(imageUri) {
  console.log('🔍 Starting Google Vision OCR process with image:', imageUri);
  console.log('🔑 API Key check:', GOOGLE_VISION_API_KEY.substring(0, 20) + '...');
  
  try {
    console.log('📡 Calling Google Vision API...');
    const transactions = await extractWithGoogleVision(imageUri);
    console.log('✅ Google Vision successful!');
    return transactions;
  } catch (error) {
    console.log('❌ Google Vision failed:', error.message);
    
    // Provide helpful error messages
    if (error.message.includes('API key not configured')) {
      throw new Error('Google Vision API key not configured. Please add your API key to use text extraction.');
    } else if (error.message.includes('403')) {
      throw new Error('Google Vision API access denied. Please check if the Vision API is enabled in your Google Cloud Console.');
    } else if (error.message.includes('400')) {
      throw new Error('Invalid request to Google Vision API. Please check your image format.');
    } else if (error.message.includes('Network')) {
      throw new Error('Network error. Please check your internet connection and try again.');
    }
    
    throw new Error(`Google Vision API failed: ${error.message}`);
  }
}

// Note: Transaction parsing is handled by the universalBankParser module
// which provides more robust parsing for various bank statement formats

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
SETUP GOOGLE VISION API:

1. Get Google Vision API key:
   - Go to https://console.cloud.google.com/
   - Create new project or select existing
   - Enable Vision API
   - Create credentials (API key)
   - Replace GOOGLE_VISION_API_KEY above

2. Test with real bank statements:
   - Take clear, well-lit photos
   - Ensure text is readable
   - The service will extract actual transaction data

SECURITY NOTE:
- Store API key in environment variables in production
- Consider using Firebase Functions for server-side OCR
- Never commit API keys to version control

FEATURES:
- Automatic text extraction from bank statement photos
- Smart transaction parsing for Norwegian bank formats
- Merchant name cleaning and categorization
- Amount parsing with Norwegian number formats
*/
