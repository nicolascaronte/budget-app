/* ============================================================
   UNIVERSAL BANK STATEMENT PARSER
   Works with multiple bank formats and countries
   ============================================================ */

/**
 * Parse transactions from any bank statement text
 * @param {string} text - Raw OCR text
 * @returns {Array} - Parsed transactions
 */
export function parseUniversalBankStatement(text) {
  console.log('🌍 Universal bank parser starting...');
  console.log('📄 Raw text:', text);
  
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  const transactions = [];
  
  console.log(`📝 Processing ${lines.length} lines...`);
  
  // Strategy: Find all amounts first, then find their merchants
  const amountLines = [];
  
  // Step 1: Find all lines with amounts
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const amounts = findAmountsInLine(line, i);
    amountLines.push(...amounts);
  }
  
  console.log(`💰 Found ${amountLines.length} potential amounts`);
  
  // Step 2: For each amount, find the best merchant match
  for (const amountInfo of amountLines) {
    const merchant = findMerchantForAmount(lines, amountInfo);
    
    if (merchant) {
      const cleanMerchant = cleanMerchantName(merchant);
      
      if (cleanMerchant.length > 1) {
        const type = determineTransactionType(cleanMerchant, amountInfo.amount);
        
        transactions.push({
          text: `${merchant} ${amountInfo.amount}`,
          merchant: cleanMerchant,
          amount: amountInfo.amount,
          type: type,
          id: Date.now() + Math.random() + amountInfo.lineIndex,
        });
        
        console.log(`✅ SUCCESS: ${cleanMerchant} - ${amountInfo.amount} kr (${type})`);
      }
    }
  }
  
  console.log(`🎯 Final result: ${transactions.length} transactions`);
  
  // Remove duplicates and sort
  return removeDuplicates(transactions).sort((a, b) => b.amount - a.amount);
}

/**
 * Find all amounts in a line
 */
function findAmountsInLine(line, lineIndex) {
  const amounts = [];
  
  // Multiple patterns for different formats
  const patterns = [
    // Norwegian: -274,71 or -4 349,00
    /[\-\+]?\s*\d{1,3}(?:\s\d{3})*[,]\d{1,2}/g,
    // International: -274.71 or -4,349.00  
    /[\-\+]?\s*\d{1,3}(?:,\d{3})*[\.]\d{1,2}/g,
    // Simple: -274 or 274
    /[\-\+]?\s*\d{1,6}/g,
  ];
  
  for (const pattern of patterns) {
    const matches = [...line.matchAll(pattern)];
    for (const match of matches) {
      const amountStr = match[0];
      const amount = parseUniversalAmount(amountStr);
      
      if (amount >= 0.01) {
        amounts.push({
          amount: amount,
          originalStr: amountStr,
          lineIndex: lineIndex,
          line: line
        });
        console.log(`💵 Found amount in line ${lineIndex}: ${amountStr} -> ${amount}`);
      }
    }
  }
  
  return amounts;
}

/**
 * Find merchant name for an amount
 */
function findMerchantForAmount(lines, amountInfo) {
  const { lineIndex } = amountInfo;
  
  // Look in nearby lines for merchant names
  for (let distance = 1; distance <= 3; distance++) {
    // Check lines before the amount
    const checkIndex = lineIndex - distance;
    if (checkIndex >= 0) {
      const line = lines[checkIndex]?.trim();
      if (line && isPossibleMerchant(line)) {
        console.log(`🏪 Found merchant ${distance} lines back: "${line}"`);
        return line;
      }
    }
  }
  
  // Also check if amount is on same line as merchant
  const sameLine = amountInfo.line;
  const withoutAmount = sameLine.replace(amountInfo.originalStr, '').trim();
  if (withoutAmount.length > 3 && isPossibleMerchant(withoutAmount)) {
    console.log(`🏪 Found merchant on same line: "${withoutAmount}"`);
    return withoutAmount;
  }
  
  console.log(`❌ No merchant found for amount ${amountInfo.amount}`);
  return null;
}

/**
 * Check if a line could be a merchant name
 */
function isPossibleMerchant(line) {
  // Skip date lines
  if (/\b(mandag|tirsdag|onsdag|torsdag|fredag|lørdag|søndag|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(line)) {
    return false;
  }
  
  // Skip pure date lines
  if (/^\d{1,2}[\.\/\-]\d{1,2}[\.\/\-]\d{2,4}$/.test(line)) {
    return false;
  }
  
  // Skip lines that are just amounts
  if (/^[\-\+]?\s*\d+[\s,\.]*\d*$/.test(line)) {
    return false;
  }
  
  // Skip very short lines
  if (line.length < 3) {
    return false;
  }
  
  // Skip common bank statement headers
  const skipWords = ['saldo', 'balance', 'total', 'sum', 'reservert', 'pending'];
  if (skipWords.some(word => line.toLowerCase().includes(word))) {
    return false;
  }
  
  return true;
}

/**
 * Parse amount from any format
 */
function parseUniversalAmount(amountStr) {
  if (!amountStr) return 0;
  
  let cleaned = String(amountStr).trim();
  
  // Remove currency symbols
  cleaned = cleaned.replace(/kr|nok|øre|\$|€|£/gi, '').trim();
  
  // Remove leading/trailing spaces and signs for processing
  const isNegative = cleaned.startsWith('-');
  cleaned = cleaned.replace(/^[\-\+\s]+/, '').replace(/\s+$/, '');
  
  // Handle different decimal formats
  if (cleaned.includes(',') && cleaned.includes('.')) {
    // Both comma and dot - determine which is decimal
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    
    if (lastComma > lastDot) {
      // Comma is decimal: 1.234,56
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // Dot is decimal: 1,234.56
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (cleaned.includes(',')) {
    // Only comma - could be thousand separator or decimal
    const commaIndex = cleaned.lastIndexOf(',');
    const afterComma = cleaned.substring(commaIndex + 1);
    
    if (afterComma.length <= 2) {
      // Decimal separator: 274,71
      cleaned = cleaned.replace(',', '.');
    } else {
      // Thousand separator: 1,234
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (cleaned.includes(' ')) {
    // Space as thousand separator: 4 349
    cleaned = cleaned.replace(/\s/g, '');
  }
  
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : Math.abs(num);
}

/**
 * Clean merchant name for any language
 */
function cleanMerchantName(rawMerchant) {
  if (!rawMerchant) return '';
  
  let cleaned = rawMerchant
    .replace(/\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/g, '') // Remove dates
    .replace(/[\-\+]?\d+[,\.\s]?\d*/g, '') // Remove amounts
    .replace(/\*+/g, ' ') // Replace asterisks with spaces
    .replace(/\.{3,}/g, ' ') // Replace ellipsis with spaces
    .replace(/[^\w\sæøåÆØÅäöüÄÖÜßéèêëàâçñ]/g, ' ') // Keep international characters
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
  
  // Remove common location indicators
  cleaned = cleaned.replace(/,\s*[A-ZÆØÅ][a-zæøå]+$/i, ''); // Remove ", Location"
  
  // Take first meaningful part if too long
  if (cleaned.length > 25) {
    const words = cleaned.split(/\s+/);
    cleaned = words.slice(0, 3).join(' ');
  }
  
  return cleaned.toUpperCase();
}

/**
 * Determine transaction type with international support
 */
function determineTransactionType(merchant, amount) {
  const merchantLower = merchant.toLowerCase();
  
  // Income keywords (multiple languages)
  const incomeKeywords = [
    'salary', 'lønn', 'wage', 'lön', 'gehalt',
    'deposit', 'innskudd', 'insättning', 'einzahlung',
    'refund', 'refusjon', 'återbetalning', 'erstattung',
    'transfer in', 'overføring inn', 'överföring in',
    'payment received', 'betaling mottatt'
  ];
  
  // Savings keywords
  const savingsKeywords = [
    'savings', 'sparing', 'sparande', 'sparen',
    'investment', 'investering', 'investering', 'investition',
    'pension', 'pensjon', 'pension', 'rente',
    'transfer to', 'overføring til', 'överföring till'
  ];
  
  // Check for income
  if (incomeKeywords.some(keyword => merchantLower.includes(keyword))) {
    return 'income';
  }
  
  // Check for savings
  if (savingsKeywords.some(keyword => merchantLower.includes(keyword))) {
    return 'savings';
  }
  
  // Large amounts (>10000) might be income or savings
  if (amount > 10000) {
    return 'income'; // Assume salary/large income
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
