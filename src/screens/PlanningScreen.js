import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Swipeable } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';

/* ---------- Utils ---------- */
// Sanitize typing: remove spaces (incl. NBSP), keep digits and one dot/comma, convert comma->dot
function sanitizeAmountText(t) {
  const noSpaces = String(t).replace(/\s|\u00A0/g, '');
  const commaToDot = noSpaces.replace(',', '.');
  const cleaned = commaToDot.replace(/[^0-9.]/g, '');
  const parts = cleaned.split('.');
  return parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : cleaned;
}

// Parse to number for math (handles spaces & comma decimal)
function parseNum(v) {
  if (v == null) return 0;
  const s = String(v).replace(/\s|\u00A0/g, '').replace(',', '.');
  const n = parseFloat(s);
  return Number.isNaN(n) ? 0 : n;
}

// Format integer part with regular spaces; preserve optional decimals (max 2)
function formatWithSpaces(numOrStr) {
  if (numOrStr == null) return '0';
  const raw =
    typeof numOrStr === 'number'
      ? String(numOrStr)
      : String(numOrStr).replace(/\s|\u00A0/g, '').replace(',', '.');

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

function sortByAmountDesc(arr) {
  return [...arr].sort((a, b) => parseNum(b.amount) - parseNum(a.amount));
}

function addMonths(date, delta) {
  const d = new Date(date.getFullYear(), date.getMonth() + delta, 1);
  return d;
}

function formatMonthYearText(date) {
  return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

/* ---------- UI Subcomponents ---------- */
const Card = ({ children }) => (
  <View className="bg-surface p-4 rounded-2xl mb-4">{children}</View>
);

const Section = ({
  title,
  colorClass,
  items,
  onAddPress,
  onEditAmount,
  onBlurAmount,
  onDeleteItem,
}) => {
  const total = sumItems(items);

  const renderRightActions = (idx) => (
    <TouchableOpacity
      onPress={() => onDeleteItem(idx)}
      className="bg-expenses justify-center items-center w-[84px] rounded-r-xl"
      activeOpacity={0.9}
    >
      <Text className="text-white font-bold">Delete</Text>
    </TouchableOpacity>
  );

  return (
    <Card>
      <Text className={`${colorClass} text-lg font-bold mb-3`}>{title}</Text>

      {items.map((item, idx) => (
        <Swipeable
          key={`${item.name}-${idx}`}
          renderRightActions={() => renderRightActions(idx)}
          overshootRight={false}
        >
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-textLight/90 flex-1 pr-3">{item.name}</Text>

            {/* Inline editable amount */}
            <View className="flex-row items-center">
              <TextInput
                value={String(item.amount)}
                onChangeText={(t) => onEditAmount(idx, sanitizeAmountText(t))}
                onBlur={() => onBlurAmount(idx)} // format with spaces when leaving field
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor="#777"
                className="bg-[#202020] text-textLight px-3 py-2 rounded-xl text-right min-w-[100px]"
                returnKeyType="done"
              />
              <Text className="text-textLight/70 ml-2">kr</Text>
            </View>
          </View>
        </Swipeable>
      ))}

      <View className="h-px bg-divider my-3" />

      <View className="flex-row items-center justify-between">
        <TouchableOpacity onPress={onAddPress}>
          <Text className={`${colorClass} font-semibold`}>
            + Add {title === 'Savings' ? 'Goal' : 'Category'}
          </Text>
        </TouchableOpacity>
        <Text className={`${colorClass} font-bold`}>
          Total: {formatWithSpaces(total)} kr
        </Text>
      </View>
    </Card>
  );
};

/* ---------- Screen ---------- */
export default function PlanningScreen() {
  const insets = useSafeAreaInsets();

  // Month being viewed/edited
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const currentMonthYear = formatMonthYearText(currentDate);

  // Month key (e.g., 2025-03)
  const monthKey = useMemo(() => {
    const y = currentDate.getFullYear();
    const m = String(currentDate.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }, [currentDate]);

  // Data lists
  const [income, setIncome] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [savings, setSavings] = useState([]);

  // Draft modal
  const [modal, setModal] = useState({ open: false, section: null });
  const [draft, setDraft] = useState({ name: '', amount: '' });

  // Prevent saving while (re)loading a month
  const [isLoadingMonth, setIsLoadingMonth] = useState(true);

  // Storage keys (per month)
  const K = {
    income: `budget.${monthKey}.income`,
    expenses: `budget.${monthKey}.expenses`,
    savings: `budget.${monthKey}.savings`,
  };

  // Load persisted data whenever the month changes
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoadingMonth(true);
      try {
        const [i, e, s] = await Promise.all([
          AsyncStorage.getItem(K.income),
          AsyncStorage.getItem(K.expenses),
          AsyncStorage.getItem(K.savings),
        ]);
        if (cancelled) return;
        setIncome(i ? sortByAmountDesc(JSON.parse(i)) : []);
        setExpenses(e ? sortByAmountDesc(JSON.parse(e)) : []);
        setSavings(s ? sortByAmountDesc(JSON.parse(s)) : []);
      } catch (err) {
        console.warn('Failed to load month data:', err);
        if (!cancelled) {
          setIncome([]);
          setExpenses([]);
          setSavings([]);
        }
      } finally {
        if (!cancelled) setIsLoadingMonth(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [K.income, K.expenses, K.savings]);

  // Auto-save when lists change (skip during initial month load)
  useEffect(() => {
    if (isLoadingMonth) return;
    AsyncStorage.setItem(K.income, JSON.stringify(income)).catch(() => {});
  }, [income, K.income, isLoadingMonth]);

  useEffect(() => {
    if (isLoadingMonth) return;
    AsyncStorage.setItem(K.expenses, JSON.stringify(expenses)).catch(() => {});
  }, [expenses, K.expenses, isLoadingMonth]);

  useEffect(() => {
    if (isLoadingMonth) return;
    AsyncStorage.setItem(K.savings, JSON.stringify(savings)).catch(() => {});
  }, [savings, K.savings, isLoadingMonth]);

  // Totals + Balance
  const incomeTotal = sumItems(income);
  const expenseTotal = sumItems(expenses);
  const savingsTotal = sumItems(savings);
  const afterExpenses = incomeTotal - expenseTotal;
  const leftover = afterExpenses - savingsTotal;
  const balanceColor = afterExpenses >= 0 ? 'text-savings' : 'text-expenses';
  const leftoverColor = leftover >= 0 ? 'text-savings' : 'text-expenses';

  // Month nav
  const goPrevMonth = () => setCurrentDate((d) => addMonths(d, -1));
  const goNextMonth = () => setCurrentDate((d) => addMonths(d, +1));

  // Actions
  const openAdd = (section) => {
    setDraft({ name: '', amount: '' });
    setModal({ open: true, section });
  };

  const addItem = () => {
    const sanitized = sanitizeAmountText(draft.amount);
    const entry = {
      name: draft.name.trim() || 'Untitled',
      amount: formatWithSpaces(sanitized), // store formatted so it looks right immediately
    };
    if (modal.section === 'income') setIncome((x) => sortByAmountDesc([...x, entry]));
    if (modal.section === 'expenses') setExpenses((x) => sortByAmountDesc([...x, entry]));
    if (modal.section === 'savings') setSavings((x) => sortByAmountDesc([...x, entry]));
    setModal({ open: false, section: null });
  };

  const editAmountFactory = (section) => (idx, newVal) => {
    const update = (arr) =>
      sortByAmountDesc(arr.map((it, i) => (i === idx ? { ...it, amount: newVal } : it)));
    if (section === 'income') setIncome(update);
    if (section === 'expenses') setExpenses(update);
    if (section === 'savings') setSavings(update);
  };

  const blurAmountFactory = (section) => (idx) => {
    const formatRow = (arr) =>
      sortByAmountDesc(arr.map((it, i) => (i === idx ? { ...it, amount: formatWithSpaces(it.amount) } : it)));
    if (section === 'income') setIncome(formatRow);
    if (section === 'expenses') setExpenses(formatRow);
    if (section === 'savings') setSavings(formatRow);
  };

  const deleteItemFactory = (section) => (idx) => {
    const sectionLabel = section[0].toUpperCase() + section.slice(1);
    Alert.alert(
      `Delete ${sectionLabel}`,
      'Are you sure you want to remove this item?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            if (section === 'income')
              setIncome((arr) => sortByAmountDesc(arr.filter((_, i) => i !== idx)));
            if (section === 'expenses')
              setExpenses((arr) => sortByAmountDesc(arr.filter((_, i) => i !== idx)));
            if (section === 'savings')
              setSavings((arr) => sortByAmountDesc(arr.filter((_, i) => i !== idx)));
          },
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <View
      className="flex-1 bg-backgroundDark"
      style={{ paddingTop: insets.top + 8 }}
    >
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 70 + insets.bottom + 20 }}
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="automatic"
        >
          {/* Header with month switcher */}
          <View className="flex-row items-center justify-between mb-2">
            <TouchableOpacity onPress={goPrevMonth} className="px-2 py-1 rounded-xl bg-[#202020]">
              <Text className="text-textLight text-xl">‹</Text>
            </TouchableOpacity>

            <View className="items-center">
              <Text className="text-textLight text-2xl font-extrabold">Planning</Text>
              <Text className="text-textLight/70 text-lg">{currentMonthYear}</Text>
            </View>

            <TouchableOpacity onPress={goNextMonth} className="px-2 py-1 rounded-xl bg-[#202020]">
              <Text className="text-textLight text-xl">›</Text>
            </TouchableOpacity>
          </View>

          {/* Monthly Balance */}
          <View className="bg-surface p-4 rounded-2xl mb-4">
            <Text className="text-textLight text-base font-semibold mb-3">Monthly Balance</Text>

            <View className="flex-row justify-between mb-1">
              <Text className="text-white/70">Income</Text>
              <Text className="text-textLight">{formatWithSpaces(incomeTotal)} kr</Text>
            </View>
            <View className="flex-row justify-between mb-1">
              <Text className="text-white/70">Expenses</Text>
              <Text className="text-textLight">{formatWithSpaces(expenseTotal)} kr</Text>
            </View>
            <View className="flex-row justify-between mb-3">
              <Text className="text-white/70">Savings</Text>
              <Text className="text-textLight">{formatWithSpaces(savingsTotal)} kr</Text>
            </View>

            <View className="h-px bg-divider mb-3" />

            <View className="flex-row justify-between mb-1">
              <Text className="text-white/90 font-semibold">After Expenses</Text>
              <Text className={`${balanceColor} font-bold`}>
                {formatWithSpaces(afterExpenses)} kr
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-white/90 font-semibold">Leftover (after Expenses & Savings)</Text>
              <Text className={`${leftoverColor} font-bold`}>
                {formatWithSpaces(leftover)} kr
              </Text>
            </View>
          </View>

          {/* Sections */}
          <Section
            title="Income"
            colorClass="text-income"
            items={income}
            onAddPress={() => openAdd('income')}
            onEditAmount={editAmountFactory('income')}
            onBlurAmount={blurAmountFactory('income')}
            onDeleteItem={deleteItemFactory('income')}
          />
          <Section
            title="Expenses"
            colorClass="text-expenses"
            items={expenses}
            onAddPress={() => openAdd('expenses')}
            onEditAmount={editAmountFactory('expenses')}
            onBlurAmount={blurAmountFactory('expenses')}
            onDeleteItem={deleteItemFactory('expenses')}
          />
          <Section
            title="Savings"
            colorClass="text-savings"
            items={savings}
            onAddPress={() => openAdd('savings')}
            onEditAmount={editAmountFactory('savings')}
            onBlurAmount={blurAmountFactory('savings')}
            onDeleteItem={deleteItemFactory('savings')}
          />
        </ScrollView>

        {/* Add Item Modal */}
        <Modal
          visible={modal.open}
          transparent
          animationType="slide"
          onRequestClose={() => setModal({ open: false, section: null })}
        >
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 justify-end">
            <View className="flex-1 bg-black/60 justify-end">
              <View
                className="bg-surface p-4 rounded-t-2xl"
                style={{ paddingBottom: Math.max(insets.bottom, 12) }}
              >
                <Text className="text-textLight text-lg font-bold mb-3">
                  Add {modal.section ? modal.section[0].toUpperCase() + modal.section.slice(1) : ''} Item
                </Text>

                <Text className="text-white/70 mb-1">Name</Text>
                <TextInput
                  value={draft.name}
                  onChangeText={(t) => setDraft((d) => ({ ...d, name: t }))}
                  placeholder="e.g., Groceries"
                  placeholderTextColor="#777"
                  className="bg-[#202020] text-textLight p-3 rounded-xl mb-3"
                />

                <Text className="text-white/70 mb-1">Amount</Text>
                <TextInput
                  value={draft.amount}
                  onChangeText={(t) => setDraft((d) => ({ ...d, amount: sanitizeAmountText(t) }))}
                  onBlur={() => setDraft((d) => ({ ...d, amount: formatWithSpaces(d.amount) }))}
                  keyboardType="decimal-pad"
                  placeholder="e.g., 500"
                  placeholderTextColor="#777"
                  className="bg-[#202020] text-textLight p-3 rounded-xl mb-4"
                />

                <View className="flex-row space-x-3">
                  <TouchableOpacity
                    onPress={() => setModal({ open: false, section: null })}
                    className="flex-1 bg-[#2A2A2A] p-3 rounded-xl"
                  >
                    <Text className="text-textLight text-center font-semibold">Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={addItem} className="flex-1 bg-income p-3 rounded-xl">
                    <Text className="text-white text-center font-bold">Add</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </KeyboardAvoidingView>
    </View>
  );
}
