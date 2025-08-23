# 🤖 Google Vision API Setup Guide

Follow these exact steps to get real OCR working with your bank statements.

## 📋 Step-by-Step Setup

### 1. Create Google Cloud Account
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account
3. Accept terms if prompted

### 2. Create New Project
1. Click "Select a project" at the top
2. Click "New Project"
3. Name it: `budget-app-ocr`
4. Click "Create"
5. Wait for project creation (30 seconds)

### 3. Enable Vision API
1. In the search bar, type "Vision API"
2. Click on "Cloud Vision API"
3. Click "Enable" button
4. Wait for API to be enabled (1-2 minutes)

### 4. Create API Key
1. Go to "Credentials" in the left menu
2. Click "+ Create Credentials"
3. Select "API Key"
4. Copy the generated API key (looks like: `AIzaSyC...`)
5. Click "Restrict Key" (recommended)
6. Under "API restrictions", select "Cloud Vision API"
7. Click "Save"

### 5. Add API Key to Your App
1. Open `src/services/ocrService.js`
2. Find line 10: `const GOOGLE_VISION_API_KEY = 'YOUR_API_KEY_HERE';`
3. Replace with your actual key: `const GOOGLE_VISION_API_KEY = 'AIzaSyC...';`
4. Save the file

## 💰 Pricing (Don't Worry!)
- **Free tier**: 1,000 requests per month
- **After that**: $1.50 per 1,000 requests
- **For personal use**: Essentially free

## ✅ Verification
After setup, your console should show:
```
🔍 Starting OCR process...
📡 Trying OCR.space...
⚠️ OCR.space failed: [some error]
📡 Trying Google Vision...
📄 Extracted text: [your bank statement text]
✅ Found: REMA 1000 - 287.50 kr (expense)
🎯 Found 5 transactions total
✅ Google Vision successful!
```

## 🚨 If You Get Stuck
1. Make sure Vision API is enabled
2. Check API key restrictions
3. Verify billing account is set up (even for free tier)
4. Try a different bank statement image

---

**Ready? Let's set up your API key! 🚀**
