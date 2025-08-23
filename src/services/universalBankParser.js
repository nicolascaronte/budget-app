/* ============================================================
   UNIVERSAL BANK STATEMENT PARSER
   Works with multiple bank formats and countries
   ============================================================ */

/**
 * Test function to debug parsing with known data
 */
export function testParsingWithKnownData() {
  console.log('🧪 Testing parser with known bank statement data...');
  
  const testText = `August
20.08 Fra: AAS-JAKOBSEN TRO...
Fra: AAS-JAKOBSEN TRONDHE...
120 599,33
124 871,09
20.08 Til: Marco Caronte
4 500,00
115 826,09`;

  console.log('🧪 Test data:');
  console.log(testText);
  
  const result = parseUniversalBankStatement(testText);
  
  console.log('🧪 Test results:');
  result.forEach(transaction => {
    console.log(`  ${transaction.type}: ${transaction.merchant} - ${transaction.amount} kr`);
  });
  
  return result;
}

/**
 * Ultra-simple sequential parser - process transactions in order
 * @param {string} text - Raw OCR text
 * @returns {Array} - Parsed transactions
 */
export function parseUniversalBankStatement(text) {
  console.log('🎯 Ultra-simple sequential parser starting...');
  console.log('📄 Raw OCR text:');
  console.log('================');
  console.log(text);
  console.log('================');
  
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  const transactions = [];
  
  console.log(`📝 Processing ${lines.length} non-empty lines:`);
  lines.forEach((line, i) => {
    console.log(`  Line ${i}: "${line}"`);
  });
  
  // Step 1: Collect all merchants and amounts
  const merchants = [];
  const amounts = [];
  
  // Track processed lines to avoid duplicates
  const processedLines = new Set();
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip lines that have already been processed
    if (processedLines.has(i)) {
      continue;
    }
    
    // Handle split date-merchant pattern: "DD.MM" on current line, "Til:/Fra: MERCHANT" on next line
    if (i + 1 < lines.length && /^\d{1,2}\.\d{1,2}$/.test(line)) {
      const nextLine = lines[i + 1].trim();
      if (/^(Til|Fra):\s*(.+)$/.test(nextLine)) {
        const dateMatch = line.match(/^(\d{1,2}\.\d{1,2})$/);
        const merchantMatch = nextLine.match(/^(Til|Fra):\s*(.+)$/);
        
        if (dateMatch && merchantMatch) {
          const [, date] = dateMatch;
          const [, direction, merchantCandidate] = merchantMatch;
          
          // Check if the "merchant" is actually just an account number (like "4212 09 64008")
          const isAccountNumber = /^\d{4}\s+\d{2}\s+\d{5}$/.test(merchantCandidate);
          
          let finalMerchant = merchantCandidate;
          let linesToSkip = 1;
          let foundBetterMerchant = false;
          
          // If it's an account number, look for the real merchant name in the next few lines
          if (isAccountNumber) {
            console.log(`    🔍 "${merchantCandidate}" looks like account number, searching for real merchant...`);
            
            // Look in the next 3 lines for a proper merchant name
            for (let j = i + 2; j < Math.min(i + 5, lines.length); j++) {
              const possibleMerchantLine = lines[j].trim();
              console.log(`    🔍 Checking line ${j}: "${possibleMerchantLine}"`);
              
              // First try: Check if this line has a real merchant name (starts with Til:/Fra: and has actual text)
              const realMerchantMatch = possibleMerchantLine.match(/^(Til|Fra):\s*(.+)$/);
              if (realMerchantMatch) {
                const [, , realMerchant] = realMerchantMatch;
                // Make sure it's not another account number and has substance
                const isRealMerchantAccountNumber = /^\d{4}\s+\d{2}\s+\d{5}$/.test(realMerchant);
                if (!isRealMerchantAccountNumber && realMerchant.length > 5 && !/^\d+$/.test(realMerchant)) {
                  finalMerchant = realMerchant;
                  linesToSkip = j - i; // Skip all lines up to the real merchant
                  // Update merchantInfo to search for amounts around the REAL merchant location
                  const merchantInfo = { date, direction, merchant: finalMerchant };
                  
                  merchants.push({
                    ...merchantInfo,
                    merchant: finalMerchant,
                    lineIndex: j // Use the real merchant line index for amount searching!
                  });
                  console.log(`🏪 Found split merchant (updated): ${date} ${direction}: ${finalMerchant} (line ${j})`);
                  
                  // Before marking processed, capture any amount-only lines in the skipped range
                  for (let k = i; k <= j; k++) {
                    const midLine = lines[k]?.trim?.() ?? '';
                    if (midLine && isTransactionAmountOnly(midLine)) {
                      const amountVal = parseAmount(midLine);
                      const isNeg = midLine.startsWith('-');
                      amounts.push({ amount: Math.abs(amountVal), isNegative: isNeg, lineIndex: k, line: midLine, used: false });
                    }
                  }
                  // Mark all processed lines to avoid duplicates
                  for (let k = i; k <= j; k++) {
                    processedLines.add(k);
                  }
                  
                  // Skip the processed lines and continue main loop
                  i += linesToSkip;
                  foundBetterMerchant = true; // 🔥 FIX: Set flag to prevent fallback logic
                  break;
                }
              }
              
              // If we found a real merchant above, we already added it to merchants
              if (finalMerchant !== merchantCandidate) {
                foundBetterMerchant = true;
                break; // Exit the inner search loop
              }
              
              // Second try: Look for standalone merchant names (no Til:/Fra: prefix)
              // Skip if it's an amount, account number, or too short
              const isAmount = /^-?\d[\d\s]*[,.]?\d*$/.test(possibleMerchantLine);
              const isStandaloneAccountNumber = /^\d{4}\s+\d{2}\s+\d{5}$/.test(possibleMerchantLine);
              
              if (!isAmount && !isStandaloneAccountNumber && possibleMerchantLine.length > 5 && 
                  !possibleMerchantLine.match(/^\d{1,2}\.\d{1,2}$/) && // not just a date
                  possibleMerchantLine.match(/[a-zA-ZæøåÆØÅ]/)) { // contains letters
                
                finalMerchant = possibleMerchantLine;
                linesToSkip = j - i; // Skip all lines up to the real merchant
                
                // Add the merchant with the standalone merchant line index
                const merchantInfo = { date, direction, merchant: finalMerchant };
                
                merchants.push({
                  ...merchantInfo,
                  merchant: finalMerchant,
                  lineIndex: j // Use the standalone merchant line index for amount searching!
                });
                                        console.log(`🏪 Found split merchant (standalone): ${date} ${direction}: ${finalMerchant} (line ${j})`);
                        
                        // Before marking processed, capture any amount-only lines in the skipped range
                        for (let k = i; k <= j; k++) {
                          const midLine = lines[k]?.trim?.() ?? '';
                          if (midLine && isTransactionAmountOnly(midLine)) {
                            const amountVal = parseAmount(midLine);
                            const isNeg = midLine.startsWith('-');
                            amounts.push({ amount: Math.abs(amountVal), isNegative: isNeg, lineIndex: k, line: midLine, used: false });
                          }
                        }
                        // Mark all processed lines to avoid duplicates
                        for (let k = i; k <= j; k++) {
                          processedLines.add(k);
                        }
                        
                        // Skip the processed lines and continue main loop
                        i += linesToSkip;
                        foundBetterMerchant = true; // 🔥 This flag prevents fallback logic
                        break;
              }
            }
          }
          
          // Only add the merchant if we DIDN'T find a better one (which was already added above)
          if (!foundBetterMerchant) {
            const merchantInfo = { date, direction, merchant: finalMerchant };
            
            merchants.push({
              ...merchantInfo,
              merchant: finalMerchant,
              lineIndex: i
            });
            console.log(`🏪 Found split merchant: ${date} ${direction}: ${finalMerchant}`);
            
            // Mark processed lines
            for (let k = i; k <= i + linesToSkip; k++) {
              processedLines.add(k);
            }
            
            // Skip the processed lines
            i += linesToSkip;
          }
          continue;
        }
      }
    }
    
    // Collect merchant descriptor lines
    if (isMerchantDescriptor(line)) {
      console.log(`🏪 Processing merchant line ${i}: "${line}"`);
      const merchantInfo = parseMerchantDescriptor(line);
      
      if (merchantInfo) {
        // Check if the next line might be a more specific merchant name OR another descriptor
        let finalMerchant = merchantInfo.merchant;
        let skipNextLine = false;
        
        // Check if this merchant is an account number - if so, look for better names
        const isAccountNumber = /^\d{4}\s+\d{2}\s+\d{5}$/.test(merchantInfo.merchant);
        
        // Check if this is a direct merchant pattern (like Vipps) - don't override these
        const isDirectMerchantPattern = /^(Vipps\*.*|Vipps.*Entur.*|Vipps.*Cutters.*|.*Entur.*App|.*Cutters.*AS)/i.test(merchantInfo.merchant);
        
        if (i + 1 < lines.length && !isDirectMerchantPattern) {
          const nextLine = lines[i + 1].trim();
          
          // Check if next line is "Til: ActualMerchant" or "Fra: ActualMerchant"
          if (nextLine.startsWith('Til: ') || nextLine.startsWith('Fra: ')) {
            const actualMerchant = nextLine.substring(5).trim(); // Remove "Til: " or "Fra: "
            // Use actual merchant if it's not just numbers, OR if current merchant is account number
            if (actualMerchant && (!actualMerchant.match(/^\d+/) || isAccountNumber)) {
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
        
        // Mark this line as processed
        processedLines.add(i);
        
        // Skip the next line if we used it as merchant name
        if (skipNextLine) {
          processedLines.add(i + 1); // Mark next line as processed
          i++; // Skip next iteration
        }
      } else {
        console.log(`🏪 Merchant info was null for line ${i}: "${line}"`);
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
      console.log(`💰 Found amount on line ${i}: "${line}" -> ${amount} kr (${isNegative ? 'negative' : 'positive'})`);
    } else {
      // Debug: Show lines that don't match amount patterns
      if (line.match(/\d+[,\.]\d{2}/) && !line.match(/^\d{1,2}\.\d{1,2}/)) { // Contains amount-like numbers but not dates
        console.log(`⚠️ Potential amount not detected on line ${i}: "${line}"`);
      }
    }
  }
  
  console.log(`Found ${merchants.length} merchants and ${amounts.length} amounts`);
  
  // Debug: Show all merchants to identify duplicates (disabled for production)
  // console.log('🎯 All merchants found:');
  // merchants.forEach((merchant, index) => {
  //   console.log(`  ${index + 1}. Line ${merchant.lineIndex}: "${merchant.date} ${merchant.direction}: ${merchant.merchant}"`);
  // });
  
  // Step 2: Match merchants with amounts (simplified approach)
  for (const merchantInfo of merchants) {
    console.log(`\n🎯 Matching merchant: ${merchantInfo.date} ${merchantInfo.direction}: ${merchantInfo.merchant}`);
    
    let foundAmount = null;
    
    if (merchantInfo.direction === 'Til') {
      // EXPENSES: Find closest unused negative amount within reasonable distance
      console.log(`  🔍 Looking for negative amount for expense transaction...`);
      
      // Only look within 6 lines of the merchant to prevent stealing amounts from other transactions
      const maxDistance = 6;
      const candidatesNearby = amounts.filter(a => 
        Math.abs(a.lineIndex - merchantInfo.lineIndex) <= maxDistance && 
        !a.used && 
        a.isNegative
      );
      
      console.log(`  📍 Found ${candidatesNearby.length} negative amounts within ${maxDistance} lines`);
      
      if (candidatesNearby.length > 0) {
        // Smart selection: prefer amounts that come after the merchant, then by distance
        const bestCandidate = candidatesNearby.reduce((best, current) => {
          const bestDistance = Math.abs(best.lineIndex - merchantInfo.lineIndex);
          const currentDistance = Math.abs(current.lineIndex - merchantInfo.lineIndex);
          
          // If distances are equal, prefer the one that comes AFTER the merchant (more logical)
          if (bestDistance === currentDistance) {
            const bestAfterMerchant = best.lineIndex > merchantInfo.lineIndex;
            const currentAfterMerchant = current.lineIndex > merchantInfo.lineIndex;
            
            if (currentAfterMerchant && !bestAfterMerchant) return current; // Current comes after, prefer it
            if (bestAfterMerchant && !currentAfterMerchant) return best;    // Best comes after, keep it
          }
          
          return currentDistance < bestDistance ? current : best;
        });
        
        const isAfterMerchant = bestCandidate.lineIndex > merchantInfo.lineIndex ? ' (after merchant)' : ' (before merchant)';
        console.log(`  💰 Found best expense amount: ${bestCandidate.line} -> ${bestCandidate.amount} kr (distance: ${Math.abs(bestCandidate.lineIndex - merchantInfo.lineIndex)})${isAfterMerchant}`);
        foundAmount = bestCandidate;
      } else {
        console.log(`  ❌ No expense amounts found within ${maxDistance} lines of merchant`);
      }
    } else {
      // INCOME: Find first unused positive amount - simplified approach
      console.log(`  🔍 Looking for positive amount for income transaction...`);
      
      // First, try to find amount within reasonable distance
      const searchRange = 20; // Expanded search range
      let candidatesNearby = [];
      
      // Search both forward and backward from merchant line
      for (let j = Math.max(0, merchantInfo.lineIndex - searchRange); j <= merchantInfo.lineIndex + searchRange; j++) {
        const candidateAmount = amounts.find(a => a.lineIndex === j && !a.used && !a.isNegative);
        if (candidateAmount) {
          candidatesNearby.push(candidateAmount);
        }
      }
      
      console.log(`  📍 Found ${candidatesNearby.length} positive amounts within ${searchRange} lines`);
      
      // Evaluate candidates with improved logic - prioritize by proximity and context
      console.log(`  📊 Evaluating ${candidatesNearby.length} candidate amounts...`);
      
      // Sort candidates by absolute distance from merchant (closer is better)
      candidatesNearby.sort((a, b) => Math.abs(a.lineIndex - merchantInfo.lineIndex) - Math.abs(b.lineIndex - merchantInfo.lineIndex));
      
      for (const candidateAmount of candidatesNearby) {
        const distance = Math.abs(candidateAmount.lineIndex - merchantInfo.lineIndex);
        console.log(`  💰 Evaluating amount: "${candidateAmount.line}" (${candidateAmount.amount} kr) [distance: ${distance}]`);
        
        let isLikelyTransaction = true;
        let confidence = 100;
        
        // Prefer amounts that are very close to the merchant line (within 3 lines)
        if (distance <= 3) {
          confidence += 20;
          console.log(`    ✅ Close to merchant (+20 confidence)`);
        }
        
        // Detect balance patterns more intelligently
        const nextAmount = amounts.find(a => a.lineIndex === candidateAmount.lineIndex + 1 && !a.isNegative);
        const prevAmount = amounts.find(a => a.lineIndex === candidateAmount.lineIndex - 1 && !a.isNegative);
        
        console.log(`    🔍 Immediate neighbors: prev=${prevAmount ? prevAmount.line + ' (line ' + prevAmount.lineIndex + ')' : 'none'}, next=${nextAmount ? nextAmount.line + ' (line ' + nextAmount.lineIndex + ')' : 'none'}`);
        
        // Also check for similar amounts within 3 lines (balance sequences don't always appear consecutively)
        const nearbyPositiveAmounts = amounts.filter(a => 
          !a.isNegative && 
          a.lineIndex !== candidateAmount.lineIndex && 
          Math.abs(a.lineIndex - candidateAmount.lineIndex) <= 3
        );
        
        console.log(`    🔍 Nearby amounts (within 3 lines): ${nearbyPositiveAmounts.map(a => a.line + ' (line ' + a.lineIndex + ')').join(', ')}`);
        
        // Pattern 1: Detect balance sequences by similarity to adjacent amounts
        let isSimilarToNeighbors = false;
        
        if (nextAmount && prevAmount) {
          // Check if this amount is similar to BOTH neighbors (strong balance indicator)
          const similarityToNext = Math.abs(candidateAmount.amount - nextAmount.amount) / Math.max(candidateAmount.amount, nextAmount.amount);
          const similarityToPrev = Math.abs(candidateAmount.amount - prevAmount.amount) / Math.max(candidateAmount.amount, prevAmount.amount);
          
          // Use absolute difference for large amounts, percentage for smaller amounts
          const absoluteDiffToNext = Math.abs(candidateAmount.amount - nextAmount.amount);
          const absoluteDiffToPrev = Math.abs(candidateAmount.amount - prevAmount.amount);
          
          // For large amounts (>10k), use absolute difference. For smaller amounts, use percentage.
          const isSimilarToNext = candidateAmount.amount > 10000 ? 
            absoluteDiffToNext < 100 : // Less than 100 kr difference for large amounts
            similarityToNext < 0.01;   // Less than 1% for smaller amounts
            
          const isSimilarToPrev = candidateAmount.amount > 10000 ?
            absoluteDiffToPrev < 100 :
            similarityToPrev < 0.01;
          
          if (isSimilarToNext || isSimilarToPrev) {
            console.log(`    ❌ Very similar to neighboring amounts (${absoluteDiffToNext} kr to next, ${absoluteDiffToPrev} kr to prev) - balance sequence`);
            confidence -= 100; // Completely reject balance sequences
            isLikelyTransaction = false;
            isSimilarToNeighbors = true;
          }
        } else if (nextAmount) {
          // Check similarity only to next amount - use same logic as above
          const absoluteDiffToNext = Math.abs(candidateAmount.amount - nextAmount.amount);
          const similarity = Math.abs(candidateAmount.amount - nextAmount.amount) / Math.max(candidateAmount.amount, nextAmount.amount);
          
          const isSimilarToNext = candidateAmount.amount > 10000 ? 
            absoluteDiffToNext < 100 : // Less than 100 kr difference for large amounts
            similarity < 0.01;         // Less than 1% for smaller amounts
          
          if (isSimilarToNext) {
            console.log(`    ❌ Similar to next amount (${absoluteDiffToNext} kr difference) - likely balance`);
            confidence -= 90; // Almost completely reject
            isLikelyTransaction = false;
            isSimilarToNeighbors = true;
          }
        }
        
        // IMPROVED BALANCE DETECTION: Check all nearby amounts for balance sequences  
        if (!isSimilarToNeighbors) {
          for (const nearbyAmount of nearbyPositiveAmounts) {
            const absoluteDiff = Math.abs(candidateAmount.amount - nearbyAmount.amount);
            
            // For large amounts (>10k), consider amounts similar if within 100 kr  
            const isSimilar = candidateAmount.amount > 10000 ? 
              absoluteDiff < 100 : // Less than 100 kr difference for large amounts
              (absoluteDiff / Math.max(candidateAmount.amount, nearbyAmount.amount)) < 0.01; // Less than 1% for smaller amounts
            
            if (isSimilar) {
              console.log(`    ❌ BALANCE PATTERN DETECTED: Similar to ${nearbyAmount.line} (line ${nearbyAmount.lineIndex}) - difference: ${absoluteDiff} kr`);
              confidence -= 80; // Heavy penalty for balance sequences
              isSimilarToNeighbors = true;
          isLikelyTransaction = false;
              break; // One similar amount is enough
            }
          }
        }
        
        // Pattern 2: Prefer amounts that are DIFFERENT from their neighbors (transaction-like)
        if (!isSimilarToNeighbors && (nextAmount || prevAmount)) {
          console.log(`    ✅ Sufficiently different from neighboring amounts - good transaction candidate (+10 confidence)`);
          confidence += 10;
        }
        
        // Pattern 3: Prefer smaller, transaction-like amounts over large balance amounts
        // For income: strongly prefer smaller amounts (typical transactions) over large amounts (likely balances)
        if (candidateAmount.amount < 1000) {
          console.log(`    ✅ Small transaction-like amount (<1000 kr) - likely real transaction (+30 confidence)`);
          confidence += 30;
        } else if (candidateAmount.amount < 5000) {
          console.log(`    ✅ Medium transaction amount (<5000 kr) - good transaction candidate (+15 confidence)`);
          confidence += 15;
        } else if (candidateAmount.amount > 10000) {
          console.log(`    ⚠️ Large amount (>10000 kr) - might be balance (-20 confidence)`);
          confidence -= 20;
        }
        
        // Round numbers are more likely to be balances (only apply if still likely a transaction)
        if (isLikelyTransaction) {
          const isRoundNumber = candidateAmount.amount % 1000 === 0 || candidateAmount.amount % 100 === 0;
          if (isRoundNumber && candidateAmount.amount > 50000) {
            console.log(`    ⚠️ Round number and large - likely balance (-20 confidence)`);
            confidence -= 20;
          }
        }
        
        // Skip amounts that look like obvious account balances (very large round amounts)
        if (candidateAmount.amount > 500000) {
          console.log(`    ❌ Very large amount (likely balance): ${candidateAmount.amount} kr`);
          isLikelyTransaction = false;
        }
        
        // Prefer amounts that don't look like balances (not ending in many zeros)
        const balancePattern = /\d+\s?\d{3},0{2}$/.test(candidateAmount.line);
        if (balancePattern && candidateAmount.amount > 200000) {
          console.log(`    ⚠️ Large round amount pattern (likely balance) - reducing confidence`);
          confidence -= 30;
        }
        
        console.log(`    📊 Final confidence: ${confidence}%`);
        
        // Track the best candidate instead of breaking early
        if (isLikelyTransaction && confidence > 50) {
          if (!foundAmount || confidence > foundAmount.confidence) {
          foundAmount = candidateAmount;
            foundAmount.confidence = confidence; // Store confidence for comparison
            console.log(`    ⭐ New best candidate! (confidence: ${confidence}%)`);
          } else {
            console.log(`    ✅ Good candidate but not better than current best (confidence: ${confidence}%)`);
          }
        } else {
          console.log(`    ❌ Rejected (confidence too low: ${confidence}%)`);
        }
      }
      
      // Log the final selection
      if (foundAmount) {
        console.log(`  🏆 FINAL SELECTION: "${foundAmount.line}" (${foundAmount.amount} kr) with confidence ${foundAmount.confidence}%`);
      }
      
      // If no good candidate found nearby, use more restrictive fallback
      if (!foundAmount) {
        console.log(`  🔍 No amounts found nearby, trying fallback search...`);
        
        // Only use fallback for amounts that are reasonably close (within 10 lines)
        const fallbackCandidates = amounts.filter(a => 
          !a.used && 
          !a.isNegative && 
          a.amount >= 10 &&
          Math.abs(a.lineIndex - merchantInfo.lineIndex) <= 10
        );
        
        if (fallbackCandidates.length > 0) {
          // Take the closest one
          const closest = fallbackCandidates.reduce((closest, current) => {
            const closestDistance = Math.abs(closest.lineIndex - merchantInfo.lineIndex);
            const currentDistance = Math.abs(current.lineIndex - merchantInfo.lineIndex);
            return currentDistance < closestDistance ? current : closest;
          });
          
          foundAmount = closest;
          console.log(`  💰 Fallback to closest positive amount: ${closest.line} -> ${closest.amount} kr (distance: ${Math.abs(closest.lineIndex - merchantInfo.lineIndex)})`);
        } else {
          console.log(`  ❌ No suitable fallback amounts found`);
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
  // Pattern 1: Standard "DD.MM Til: MERCHANT" or "DD.MM Fra: MERCHANT"
  if (/^\d{1,2}\.\d{1,2}\s+(Til|Fra):\s*(.+)$/.test(line)) {
    return true;
  }
  
  // Pattern 2: Direct merchant patterns "DD.MM MERCHANT" (Vipps, Entur, etc.)
  if (/^\d{1,2}\.\d{1,2}\s+(Vipps\*.*|Vipps.*Entur.*|Vipps.*Cutters.*|.*Entur.*App|.*Cutters.*AS|FLYT\s+AS|.*Kommune|.*kasse.*|.*kraft.*|Boliglån.*)/i.test(line)) {
    console.log(`🎯 Direct Vipps/merchant pattern detected: "${line}"`);
    return true;
  }
  
  return false;
}

/**
 * Parse merchant descriptor line
 */
function parseMerchantDescriptor(line) {
  // Pattern 1: Standard "DD.MM Til: MERCHANT" or "DD.MM Fra: MERCHANT"
  const standardMatch = line.match(/^(\d{1,2}\.\d{1,2})\s+(Til|Fra):\s*(.+)$/);
  if (standardMatch) {
    const [, date, direction, merchant] = standardMatch;
    return { date, direction, merchant };
  }
  
  // Pattern 2: Direct merchant patterns "DD.MM MERCHANT"
  const directMatch = line.match(/^(\d{1,2}\.\d{1,2})\s+(Vipps\*.*|Vipps.*Entur.*|Vipps.*Cutters.*|.*Entur.*App|.*Cutters.*AS|FLYT\s+AS|.*Kommune|.*kasse.*|.*kraft.*|Boliglån.*)/i);
  if (directMatch) {
    const [, date, merchant] = directMatch;
    // Most direct merchants are expenses (Vipps payments, etc.)
    const direction = 'Til';
    console.log(`🎯 Direct merchant parsed: ${date} ${direction}: ${merchant}`);
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
  // Negative amounts (expenses) - expanded patterns
  if (/^-\d{1,3}(?:\s\d{3})*,\d{2}$/.test(trimmed)) return true; // -75 000,00
  if (/^-\d{1,4},\d{2}$/.test(trimmed)) return true; // -599,00
  if (/^-\d+,\d{2}$/.test(trimmed)) return true; // -4500,00 (up to 4+ digits)
  
  // Positive amounts (income) - more inclusive patterns
  if (/^\d{1,3}(?:\s\d{3})+,\d{2}$/.test(trimmed)) { // 120 599,33 (space-separated thousands)
    const amount = parseAmount(trimmed);
    console.log(`✅ Matched space-separated pattern: "${trimmed}" -> ${amount} kr`);
    return amount >= 10; // Remove upper limit that was blocking legitimate income
  }
  if (/^\d{1,6},\d{2}$/.test(trimmed)) { // 274,71 or 120599,33 (no space)
    const amount = parseAmount(trimmed);
    console.log(`✅ Matched simple comma pattern: "${trimmed}" -> ${amount} kr`);
    return amount >= 10; // Remove upper limit
  }
  
  // Additional patterns for different number formats
  if (/^\d+\.\d{3},\d{2}$/.test(trimmed)) { // 120.599,33 (dot as thousand separator)
    const amount = parseAmount(trimmed);
    console.log(`✅ Matched dot-separated pattern: "${trimmed}" -> ${amount} kr`);
    return amount >= 10;
  }
  
  // More flexible pattern for any positive amount with comma decimal
  if (/^\d+(?:[\s\.]\d{3})*,\d{2}$/.test(trimmed)) { // Catch any missed patterns
    const amount = parseAmount(trimmed);
    console.log(`✅ Matched flexible positive pattern: "${trimmed}" -> ${amount} kr`);
    return amount >= 10;
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
    
    // Pattern 1.5: "DD.MM MERCHANT" (without Til:/Fra: - common for Vipps/card transactions)
    else {
      const vippsMatch = line.match(/^(\d{1,2}\.\d{1,2})\s+(Vipps.*|.*Entur.*|.*Cutters.*|.*FLYT.*|.*Kommune.*|.*kasse.*|.*kraft.*|Boliglån.*)/i);
      if (vippsMatch) {
        const [, date, merchant] = vippsMatch;
        // Determine direction based on merchant type
        const direction = merchant.toLowerCase().includes('fra:') ? 'Fra' : 'Til';
        match = { date, direction, merchant };
        score = 9; // High score, just below full pattern
        console.log(`    🎯 Direct merchant pattern: ${date} ${direction}: ${merchant} (score: ${score})`);
      }
    }
    
    // Pattern 2: Just "Til: MERCHANT" or "Fra: MERCHANT" (medium priority)
    if (!match) {
      const directionMatch = line.match(/^(Til|Fra):\s*(.+)$/);
      if (directionMatch) {
        const [, direction, merchant] = directionMatch;
        match = { date: null, direction, merchant };
        score = 8; // High score
        console.log(`    🎯 Direction + merchant: ${direction}: ${merchant} (score: ${score})`);
      }
    }
    
    // Pattern 2.5: Date on previous line + "Til:/Fra: MERCHANT" on current line
    if (!match && i > 0) {
      const prevLine = lines[i - 1].trim();
      const dateOnlyMatch = prevLine.match(/^\d{1,2}\.\d{1,2}$/);
      const directionMatch = line.match(/^(Til|Fra):\s*(.+)$/);
      
      if (dateOnlyMatch && directionMatch) {
        const date = dateOnlyMatch[0];
        const [, direction, merchant] = directionMatch;
        match = { date, direction, merchant };
        score = 7; // Good score for split patterns
        console.log(`    🎯 Split date-merchant pattern: ${date} ${direction}: ${merchant} (score: ${score})`);
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
 * Parse amount from various Norwegian formats
 */
function parseAmount(amountStr) {
  if (!amountStr) return 0;
  
  let cleaned = String(amountStr).trim();
  
  // Remove currency symbols
  cleaned = cleaned.replace(/kr|nok|øre/gi, '').trim();
  
  // Handle various Norwegian number formats
  // Remove minus sign for processing (we'll use absolute value anyway)
  cleaned = cleaned.replace(/^-/, '');
  
  // Format: 120 599,33 (space as thousand separator, comma as decimal)
  if (cleaned.includes(' ') && cleaned.includes(',')) {
    cleaned = cleaned.replace(/\s/g, '').replace(',', '.');
  } 
  // Format: 120.599,33 (dot as thousand separator, comma as decimal)  
  else if (cleaned.includes('.') && cleaned.includes(',')) {
    // Replace dot thousand separators, then comma decimal
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  }
  // Format: 599,00 (comma as decimal separator)
  else if (cleaned.includes(',')) {
      cleaned = cleaned.replace(',', '.');
  } 
  // Format: 75 000 (space as thousand separator, no decimals)
  else if (cleaned.includes(' ')) {
    cleaned = cleaned.replace(/\s/g, '');
  }
  // Format: 120599.33 (dot as decimal - less common in Norwegian but possible)
  // This is handled by parseFloat directly
  
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

