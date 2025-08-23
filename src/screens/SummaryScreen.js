import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

/* ---------- Utils ---------- */
function parseNum(v) {
  if (v == null) return 0;
  const s = String(v).replace(/\s|\u00A0/g, '').replace(',', '.');
  const n = parseFloat(s);
  return Number.isNaN(n) ? 0 : n;
}

function formatWithSpaces(numOrStr) {
  if (numOrStr == null) return '0';
  const raw = typeof numOrStr === 'number' ? String(numOrStr) : String(numOrStr).replace(/\s|\u00A0/g, '').replace(',', '.');
  const [intPartRaw, decPartRaw] = raw.split('.');
  const isNeg = intPartRaw?.startsWith('-');
  const intDigits = (isNeg ? intPartRaw.slice(1) : intPartRaw).replace(/\D/g, '') || '0';
  const intWithSpaces = intDigits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const signedInt = (isNeg ? '-' : '') + intWithSpaces;
  if (decPartRaw && decPartRaw.length > 0) {
    const dec = decPartRaw.replace(/\D/g, '').slice(0, 2);
    return dec.length ? `${signedInt}.${dec}` : signedInt;
  }
  return signedInt;
}

function sumItems(arr) {
  return arr.reduce((s, x) => s + parseNum(x.amount), 0);
}

function formatMonthYearText(date) {
  return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

/* ---------- Components ---------- */
const Card = ({ children }) => (
  <View className="bg-surface p-4 rounded-2xl mb-4">{children}</View>
);

const ProgressBar = ({ current, planned, color, label }) => {
  const percentage = planned > 0 ? Math.min((current / planned) * 100, 100) : 0;
  const isOverBudget = current > planned && planned > 0;
  
  return (
    <View className="mb-4">
      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-textLight font-semibold">{label}</Text>
        <Text className={`${isOverBudget ? 'text-expenses' : color} font-bold`}>
          {formatWithSpaces(current)} / {formatWithSpaces(planned)} kr
        </Text>
      </View>
      
      <View className="bg-[#202020] h-3 rounded-full overflow-hidden">
        <View 
          className={`h-full rounded-full ${isOverBudget ? 'bg-expenses' : color.replace('text-', 'bg-')}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </View>
      
      <Text className={`text-sm mt-1 ${isOverBudget ? 'text-expenses' : 'text-textLight/60'}`}>
        {percentage.toFixed(0)}% {isOverBudget ? 'over budget' : 'of budget used'}
      </Text>
    </View>
  );
};

const StatusCard = ({ title, amount, status, icon }) => {
  const statusColor = status === 'good' ? 'text-income' : 
                     status === 'warning' ? 'text-expenses' : 'text-textLight';
  
  return (
    <View className="bg-surface p-4 rounded-xl flex-1 mx-1">
      <Text className="text-textLight/70 text-sm mb-1">{title}</Text>
      <Text className={`${statusColor} text-xl font-bold mb-1`}>
        {formatWithSpaces(amount)} kr
      </Text>
      <Text className="text-2xl">{icon}</Text>
    </View>
  );
};

/* ---------- Main Screen ---------- */
export default function SummaryScreen() {
  const insets = useSafeAreaInsets();
  const [currentDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  
  const [budgetData, setBudgetData] = useState({
    income: [],
    expenses: [],
    savings: [],
  });
  
  const [actualData, setActualData] = useState({
    income: 0,
    expenses: 0,
    savings: 0,
  });
  
  const monthKey = useMemo(() => {
    const y = currentDate.getFullYear();
    const m = String(currentDate.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }, [currentDate]);
  
  // Load budget data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [income, expenses, savings] = await Promise.all([
          AsyncStorage.getItem(`budget.${monthKey}.income`),
          AsyncStorage.getItem(`budget.${monthKey}.expenses`),
          AsyncStorage.getItem(`budget.${monthKey}.savings`),
        ]);
        
        setBudgetData({
          income: income ? JSON.parse(income) : [],
          expenses: expenses ? JSON.parse(expenses) : [],
          savings: savings ? JSON.parse(savings) : [],
        });
        
        // Mock actual spending data (in real app, this would come from tracked transactions)
        setActualData({
          income: 28500, // Mock: slightly less than planned
          expenses: 18200, // Mock: spending data
          savings: 3200,   // Mock: savings progress
        });
      } catch (error) {
        console.warn('Failed to load summary data:', error);
      }
    };
    
    loadData();
  }, [monthKey]);
  
  // Calculate totals
  const plannedIncome = sumItems(budgetData.income);
  const plannedExpenses = sumItems(budgetData.expenses);
  const plannedSavings = sumItems(budgetData.savings);
  
  const remainingBudget = plannedIncome - actualData.expenses;
  const savingsProgress = actualData.savings;
  const budgetHealth = remainingBudget >= 0 ? 'good' : 'warning';
  
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
          <Text className="text-textLight text-2xl font-extrabold">Summary</Text>
          <Text className="text-textLight/70 text-base">{formatMonthYearText(currentDate)}</Text>
        </View>
        
        {/* Quick Status Cards */}
        <View className="flex-row mb-4">
          <StatusCard 
            title="Remaining Budget"
            amount={remainingBudget}
            status={budgetHealth}
            icon={budgetHealth === 'good' ? '😊' : '⚠️'}
          />
          <StatusCard 
            title="Savings Progress"
            amount={savingsProgress}
            status={savingsProgress >= plannedSavings ? 'good' : 'neutral'}
            icon="💰"
          />
        </View>
        
        {/* Budget vs Actual */}
        <Card>
          <Text className="text-textLight text-lg font-bold mb-4">📊 Budget vs Actual</Text>
          
          <ProgressBar 
            current={actualData.income}
            planned={plannedIncome}
            color="text-income"
            label="Income"
          />
          
          <ProgressBar 
            current={actualData.expenses}
            planned={plannedExpenses}
            color="text-expenses"
            label="Expenses"
          />
          
          <ProgressBar 
            current={actualData.savings}
            planned={plannedSavings}
            color="text-savings"
            label="Savings"
          />
        </Card>
        
        {/* Monthly Overview */}
        <Card>
          <Text className="text-textLight text-lg font-bold mb-4">📈 Monthly Overview</Text>
          
          <View className="space-y-3">
            <View className="flex-row justify-between">
              <Text className="text-textLight/70">Planned Income</Text>
              <Text className="text-income font-semibold">{formatWithSpaces(plannedIncome)} kr</Text>
            </View>
            
            <View className="flex-row justify-between">
              <Text className="text-textLight/70">Actual Income</Text>
              <Text className="text-textLight">{formatWithSpaces(actualData.income)} kr</Text>
            </View>
            
            <View className="h-px bg-divider" />
            
            <View className="flex-row justify-between">
              <Text className="text-textLight/70">Planned Expenses</Text>
              <Text className="text-expenses font-semibold">{formatWithSpaces(plannedExpenses)} kr</Text>
            </View>
            
            <View className="flex-row justify-between">
              <Text className="text-textLight/70">Actual Expenses</Text>
              <Text className="text-textLight">{formatWithSpaces(actualData.expenses)} kr</Text>
            </View>
            
            <View className="h-px bg-divider" />
            
            <View className="flex-row justify-between">
              <Text className="text-textLight/70">Planned Savings</Text>
              <Text className="text-savings font-semibold">{formatWithSpaces(plannedSavings)} kr</Text>
            </View>
            
            <View className="flex-row justify-between">
              <Text className="text-textLight/70">Actual Savings</Text>
              <Text className="text-textLight">{formatWithSpaces(actualData.savings)} kr</Text>
            </View>
          </View>
        </Card>
        
        {/* Insights */}
        <Card>
          <Text className="text-textLight text-lg font-bold mb-3">💡 Insights</Text>
          
          <View className="space-y-2">
            {remainingBudget >= 0 ? (
              <Text className="text-income">✅ You're staying within budget! Keep it up.</Text>
            ) : (
              <Text className="text-expenses">⚠️ You're {formatWithSpaces(Math.abs(remainingBudget))} kr over budget this month.</Text>
            )}
            
            {actualData.savings >= plannedSavings ? (
              <Text className="text-savings">🎯 Great job reaching your savings goal!</Text>
            ) : (
              <Text className="text-textLight/70">📈 You need {formatWithSpaces(plannedSavings - actualData.savings)} kr more to reach your savings goal.</Text>
            )}
            
            <Text className="text-textLight/70">
              💸 Your biggest expense category needs attention.
            </Text>
          </View>
        </Card>
        
        {/* Quick Actions */}
        <Card>
          <Text className="text-textLight text-lg font-bold mb-3">⚡ Quick Actions</Text>
          
          <View className="space-y-2">
            <TouchableOpacity className="bg-income/20 p-3 rounded-xl border border-income/30">
              <Text className="text-income font-semibold">📸 Upload More Transactions</Text>
            </TouchableOpacity>
            
            <TouchableOpacity className="bg-savings/20 p-3 rounded-xl border border-savings/30">
              <Text className="text-savings font-semibold">📝 Adjust This Month's Budget</Text>
            </TouchableOpacity>
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}
