/* ============================================================
   UNIVERSAL BANK STATEMENT PARSER
   Works with multiple bank formats and countries
   ============================================================ */

/**
 * Ultra-simple sequential parser - process transactions in order
 * @param {string} text - Raw OCR text
 * @returns {Array} - Parsed transactions
 */
export function parseUniversalBankStatement(text) {
  console.log('🎯 Ultra-simple sequential parser starting...');
  console.log('📄 Raw text:', text);
  
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  const transactions = [];
  
  console.log(`📝 Processing ${lines.length} lines...`);
  
  // Step 1: Collect all merchants and amounts
  const merchants = [];
  const amounts = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Collect merchant descriptor lines
    if (isMerchantDescriptor(line)) {
      const merchantInfo = parseMerchantDescriptor(line);
      
      // Check if the next line might be a more specific merchant name OR another descriptor
      let finalMerchant = merchantInfo.merchant;
      let skipNextLine = false;
      
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        
        // Check if next line is "Til: ActualMerchant" or "Fra: ActualMerchant"
        if (nextLine.startsWith('Til: ') || nextLine.startsWith('Fra: ')) {
          const actualMerchant = nextLine.substring(5).trim(); // Remove "Til: " or "Fra: "
          if (actualMerchant && !actualMerchant.match(/^\d+/)) { // Not just numbers
            finalMerchant = actualMerchant;
            skipNextLine = true; // Don't process this line again
            console.log(`🔄 Using actual merchant from next line: ${actualMerchant}`);
          }
        } else if (isSpecificMerchantName(nextLine)) {
          finalMerchant = nextLine;
        }
      }
      
      merchants.push({
        ...merchantInfo,
        merchant: finalMerchant,
        lineIndex: i
      });
      console.log(`🏪 Found merchant: ${merchantInfo.date} ${merchantInfo.direction}: ${finalMerchant}`);
      
      // Skip the next line if we used it as merchant name
      if (skipNextLine) {
        i++; // Skip next iteration
      }
    }
    
    // Collect amount lines
    if (isTransactionAmountOnly(line)) {
      const amount = parseAmount(line);
      const isNegative = line.startsWith('-');
      amounts.push({
        amount,
        isNegative,
        line,
        lineIndex: i,
        used: false
      });
      console.log(`💰 Found amount: ${line} -> ${amount} kr (${isNegative ? 'negative' : 'positive'})`);
    }
  }
  
  console.log(`Found ${merchants.length} merchants and ${amounts.length} amounts`);
  
  // Step 2: Match merchants with amounts (simplified approach)
  for (const merchantInfo of merchants) {
    console.log(`\n🎯 Matching merchant: ${merchantInfo.date} ${merchantInfo.direction}: ${merchantInfo.merchant}`);
    
    let foundAmount = null;
    
    if (merchantInfo.direction === 'Til') {
      // EXPENSES: Find first unused negative amount (same as before - works perfectly)
      for (const amountInfo of amounts) {
        if (amountInfo.used || !amountInfo.isNegative) continue;
        
        foundAmount = amountInfo;
        console.log(`  💰 Found expense amount: ${amountInfo.line} -> ${amountInfo.amount} kr`);
        break;
      }
    } else {
      // INCOME: Find first unused positive amount that looks like a transaction (not a balance)
      const searchRange = 15; // Look within reasonable distance
      
      for (let j = merchantInfo.lineIndex + 1; j <= Math.min(amounts.length - 1, merchantInfo.lineIndex + searchRange); j++) {
        const candidateAmount = amounts.find(a => a.lineIndex === j && !a.used && !a.isNegative);
        if (!candidateAmount) continue;
        
        console.log(`  💰 Evaluating income amount: ${candidateAmount.line} (${candidateAmount.amount} kr)`);
        
        // Simple filters to avoid obvious balances
        let isLikelyTransaction = true;
        
        // Skip very large amounts (likely balances)
        if (candidateAmount.amount > 50000) {
          console.log(`    ❌ Too large (likely balance): ${candidateAmount.amount} kr`);
          isLikelyTransaction = false;
        }
        
        // Skip amounts that are followed immediately by a larger amount (balance pattern)
        const nextAmount = amounts.find(a => a.lineIndex === j + 1 && !a.isNegative);
        if (nextAmount && nextAmount.amount > candidateAmount.amount * 1.1) {
          console.log(`    ❌ Followed by larger amount (likely balance): ${nextAmount.line}`);
          isLikelyTransaction = false;
        }
        
        if (isLikelyTransaction) {
          foundAmount = candidateAmount;
          console.log(`    ✅ Looks like transaction amount!`);
          break;
        }
      }
      
      // If no good candidate found nearby, take first unused positive amount
      if (!foundAmount) {
        for (const amountInfo of amounts) {
          if (amountInfo.used || amountInfo.isNegative) continue;
          foundAmount = amountInfo;
          console.log(`  💰 Fallback to first positive amount: ${amountInfo.line} -> ${amountInfo.amount} kr`);
          break;
        }
      }
    }
    
    if (foundAmount) {
      // Mark amount as used
      foundAmount.used = true;
      
      const cleanMerchant = cleanMerchantName(merchantInfo.merchant);
      const type = determineTypeFromDirection(merchantInfo.direction, cleanMerchant, foundAmount.amount);
      
      transactions.push({
        text: `${merchantInfo.date} ${cleanMerchant} - ${foundAmount.amount} kr`,
        merchant: cleanMerchant,
        amount: foundAmount.amount,
        type: type,
        date: merchantInfo.date,
        id: Date.now() + Math.random() + merchantInfo.lineIndex,
      });
      
      console.log(`✅ MATCHED: ${merchantInfo.date} ${cleanMerchant} - ${foundAmount.amount} kr (${type})`);
    } else {
      console.log(`❌ No compatible amount found for: ${merchantInfo.merchant}`);
    }
  }
  
  console.log(`🎯 Final result: ${transactions.length} transactions`);
  
  // Sort without removing duplicates (user wants true duplicates to appear)
  return transactions.sort((a, b) => b.amount - a.amount);
}

/**
 * Check if a line is a merchant descriptor
 */
function isMerchantDescriptor(line) {
  // Look for Norwegian transaction patterns: "DD.MM Til: MERCHANT" or "DD.MM Fra: MERCHANT"
  return /^\d{1,2}\.\d{1,2}\s+(Til|Fra):\s*(.+)$/.test(line);
}

/**
 * Parse merchant descriptor line
 */
function parseMerchantDescriptor(line) {
  const match = line.match(/^(\d{1,2}\.\d{1,2})\s+(Til|Fra):\s*(.+)$/);
  if (match) {
    const [, date, direction, merchant] = match;
    return { date, direction, merchant };
  }
  return null;
}

/**
 * Check if a line is a specific merchant name (like "Marco Caronte")
 */
function isSpecificMerchantName(line) {
  const trimmed = line.trim();
  
  // Skip if it's an amount, account number, or already used
  // (Removed USED_AMOUNT check to allow duplicate transactions)
  if (isTransactionAmountOnly(trimmed)) return false;
  if (/^\d+/.test(trimmed)) return false; // Starts with numbers (likely account)
  if (trimmed.startsWith('Til:') || trimmed.startsWith('Fra:')) return false; // Already a descriptor
  
  // Must contain letters and be reasonable length
  if (/[a-zA-ZæøåÆØÅ]/.test(trimmed) && trimmed.length > 3 && trimmed.length < 50) {
    return true;
  }
  
  return false;
}

/**
 * Check if a line is ONLY a transaction amount (nothing else)
 */
function isTransactionAmountOnly(line) {
  const trimmed = line.trim();
  
  // Skip if already used
  // (Removed USED_AMOUNT check to allow duplicate transactions)
  
  // Must be EXACTLY an amount, nothing else
  // Negative amounts (expenses)
  if (/^-\d{1,3}(?:\s\d{3})*,\d{2}$/.test(trimmed)) return true; // -75 000,00
  if (/^-\d{1,4},\d{2}$/.test(trimmed)) return true; // -599,00
  
  // Positive amounts (income) - but be more selective
  if (/^\d{1,3}(?:\s\d{3})*,\d{2}$/.test(trimmed) || /^\d{1,4},\d{2}$/.test(trimmed)) {
    const amount = parseAmount(trimmed);
    // Only reasonable transaction amounts, exclude obvious balances
    return amount >= 10 && amount < 200000;
  }
  
  return false;
}

/**
 * Find the closest amount to a merchant line
 */
function findClosestAmount(merchantInfo, amountLines) {
  let bestMatch = null;
  let bestDistance = Infinity;
  
  for (const amountInfo of amountLines) {
    const distance = Math.abs(amountInfo.index - merchantInfo.index);
    
    // Prefer amounts that come after the merchant (typical bank statement order)
    const penalty = amountInfo.index < merchantInfo.index ? 2 : 0;
    const adjustedDistance = distance + penalty;
    
    if (adjustedDistance < bestDistance) {
      bestDistance = adjustedDistance;
      bestMatch = amountInfo;
    }
  }
  
  console.log(`  🔗 Best amount for ${merchantInfo.merchant}: ${bestMatch?.amount} kr (distance: ${bestDistance})`);
  return bestMatch;
}

/**
 * Determine type from direction
 */
function determineTypeFromDirection(direction, merchant, amount) {
  const merchantLower = merchant.toLowerCase();
  
  // Fra = incoming = income
  if (direction === 'Fra') return 'income';
  
  // Til = outgoing - check if savings or expense
  if (direction === 'Til') {
    const savingsKeywords = ['investering', 'investment', 'sparing', 'savings', 'pension', 'fond', 'betalt'];
    if (savingsKeywords.some(keyword => merchantLower.includes(keyword))) {
      return 'savings';
    }
    return 'expense';
  }
  
  return 'expense';
}

/**
 * Find merchant info by looking backwards from amount (improved)
 */
function findMerchantBackwards(lines, amountLineIndex) {
  console.log(`🔍 Looking backwards from line ${amountLineIndex} for merchant`);
  
  let bestMatch = null;
  let bestScore = 0;
  
  // Check the previous 1-5 lines (expanded range)
  for (let i = amountLineIndex - 1; i >= Math.max(0, amountLineIndex - 5); i--) {
    const line = lines[i].trim();
    console.log(`  Checking line ${i}: "${line}"`);
    
    // Skip lines that are obviously not merchant info
    if (isObviouslyNotMerchant(line)) {
      console.log(`    ⏭️ Skipping: not merchant info`);
      continue;
    }
    
    let match = null;
    let score = 0;
    
    // Pattern 1: "DD.MM Til: MERCHANT" or "DD.MM Fra: MERCHANT" (highest priority)
    const fullMatch = line.match(/^(\d{1,2}\.\d{1,2})\s+(Til|Fra):\s*(.+)$/);
    if (fullMatch) {
      const [, date, direction, merchant] = fullMatch;
      match = { date, direction, merchant };
      score = 10; // Highest score
      console.log(`    🎯 Full transaction pattern: ${date} ${direction}: ${merchant} (score: ${score})`);
    }
    
    // Pattern 2: Just "Til: MERCHANT" or "Fra: MERCHANT" (medium priority)
    else {
      const directionMatch = line.match(/^(Til|Fra):\s*(.+)$/);
      if (directionMatch) {
        const [, direction, merchant] = directionMatch;
        match = { date: null, direction, merchant };
        score = 8; // High score
        console.log(`    🎯 Direction + merchant: ${direction}: ${merchant} (score: ${score})`);
      }
    }
    
    // Adjust score based on distance (closer is better)
    const distance = amountLineIndex - i;
    score -= distance * 0.5; // Small penalty for distance
    
    if (match && score > bestScore) {
      bestScore = score;
      bestMatch = match;
      console.log(`    ✨ New best match with score ${score}`);
    }
  }
  
  if (bestMatch) {
    console.log(`  ✅ Best merchant found: ${bestMatch.direction}: ${bestMatch.merchant} (score: ${bestScore})`);
    return bestMatch;
  }
  
  console.log(`  ❌ No merchant found`);
  return null;
}

/**
 * Check if a line is obviously not merchant info
 */
function isObviouslyNotMerchant(line) {
  // Very long numbers (account numbers, reference numbers)
  if (/^\d{10,}$/.test(line)) return true;
  
  // Account number patterns
  if (/^\d{4}[\.\s]\d{2}[\.\s]\d{5,}$/.test(line)) return true;
  
  // Large balance amounts (we already found these as transaction amounts)
  if (/^\d{6,},\d{2}$/.test(line)) return true;
  
  // Very short lines
  if (line.length < 3) return true;
  
    return false;
  }
  
/**
 * Determine transaction type based on direction, merchant, and amount
 */
function determineType(merchant, direction, amount, originalAmount) {
  const merchantLower = merchant.toLowerCase();
  
  // Fra = incoming = income
  if (direction === 'Fra') return 'income';
  
  // Til = outgoing - check if savings or expense
  if (direction === 'Til') {
    const savingsKeywords = ['investering', 'investment', 'sparing', 'savings', 'pension', 'fond', 'betalt'];
    if (savingsKeywords.some(keyword => merchantLower.includes(keyword))) {
      return 'savings';
    }
    return 'expense';
  }
  
  // If no direction found, use amount and keywords to guess
  // Positive amounts are often income
  if (originalAmount && !originalAmount.startsWith('-')) {
    const incomeKeywords = ['aas-jakobsen', 'salary', 'lønn', 'wage', 'employer', 'company', 'refund'];
    if (incomeKeywords.some(keyword => merchantLower.includes(keyword))) {
      return 'income';
    }
    // Large positive amounts are likely income
    if (amount > 5000) {
      return 'income';
    }
  }
  
  // Fallback
  return 'expense';
}

// Removed complex functions - keeping it simple

/**
 * Parse amount from various formats
 */
function parseAmount(amountStr) {
  if (!amountStr) return 0;
  
  let cleaned = String(amountStr).trim();
  
  // Remove currency symbols
  cleaned = cleaned.replace(/kr|nok|øre/gi, '').trim();
  
  // Handle various formats
  // Remove minus sign for processing (we'll use absolute value anyway)
  cleaned = cleaned.replace(/^-/, '');
  
  // Handle space as thousand separator, comma as decimal
  if (cleaned.includes(' ') && cleaned.includes(',')) {
    // Format: 75 000,00
    cleaned = cleaned.replace(/\s/g, '').replace(',', '.');
  } else if (cleaned.includes(',')) {
    // Format: 599,00
      cleaned = cleaned.replace(',', '.');
  } else if (cleaned.includes(' ')) {
    // Format: 75 000 (no decimals)
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

// Removed - using simpler determineType function above

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

