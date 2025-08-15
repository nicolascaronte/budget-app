import React, { useState } from 'react';
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

/* ---------- Utils (replace these) ---------- */
function sanitizeAmountText(t) {
  // allow digits and one decimal; convert comma->dot; remove spaces and NBSP
  const noSpaces = String(t).replace(/\s|\u00A0/g, '');
  const cleaned = noSpaces.replace(',', '.').replace(/[^0-9.]/g, '');
  const parts = cleaned.split('.');
  return parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : cleaned;
}

function parseNum(v) {
  if (v == null) return 0;
  // remove spaces (regular + NBSP) and convert comma to dot
  const s = String(v).replace(/\s|\u00A0/g, '').replace(',', '.');
  const n = parseFloat(s);
  return Number.isNaN(n) ? 0 : n;
}

function sumItems(arr) {
  return arr.reduce((s, x) => s + parseNum(x.amount), 0);
}

// Format with space as thousand separator (no decimals)
function formatKr(num) {
  return num.toLocaleString('no-NO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}


/* ---------- UI Subcomponents ---------- */
const Card = ({ children }) => (
  <View className="bg-surface p-4 rounded-2xl mb-4">{children}</View>
);

const Section = ({ title, colorClass, items, onAddPress, onEditAmount, onDeleteItem }) => {
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
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor="#777"
                className="bg-[#202020] text-textLight px-3 py-2 rounded-xl text-right min-w-[90px]"
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
          Total: {formatKr(total)} kr
        </Text>
      </View>
    </Card>
  );
};

/* ---------- Screen ---------- */
export default function PlanningScreen() {
  const insets = useSafeAreaInsets();

  const [income, setIncome] = useState([{ name: 'Salary', amount: '30 000' }]);
  const [expenses, setExpenses] = useState([{ name: 'Rent', amount: '12 000' }]);
  const [savings, setSavings] = useState([{ name: 'Emergency Fund', amount: '2000' }]);

  const [modal, setModal] = useState({ open: false, section: null });
  const [draft, setDraft] = useState({ name: '', amount: '' });

  const currentMonthYear = new Date().toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  // Totals + Balance
  const incomeTotal = sumItems(income);
  const expenseTotal = sumItems(expenses);
  const savingsTotal = sumItems(savings);
  const afterExpenses = incomeTotal - expenseTotal;
  const leftover = afterExpenses - savingsTotal;
  const balanceColor = afterExpenses >= 0 ? 'text-savings' : 'text-expenses';
  const leftoverColor = leftover >= 0 ? 'text-savings' : 'text-expenses';

  // Actions
  const openAdd = (section) => {
    setDraft({ name: '', amount: '' });
    setModal({ open: true, section });
  };

  const addItem = () => {
    const entry = {
      name: draft.name.trim() || 'Untitled',
      amount: sanitizeAmountText(draft.amount) || '0',
    };
    if (modal.section === 'income') setIncome((x) => [...x, entry]);
    if (modal.section === 'expenses') setExpenses((x) => [...x, entry]);
    if (modal.section === 'savings') setSavings((x) => [...x, entry]);
    setModal({ open: false, section: null });
  };

  const editAmountFactory = (section) => (idx, newVal) => {
    if (section === 'income') setIncome((arr) => arr.map((it, i) => (i === idx ? { ...it, amount: newVal } : it)));
    if (section === 'expenses') setExpenses((arr) => arr.map((it, i) => (i === idx ? { ...it, amount: newVal } : it)));
    if (section === 'savings') setSavings((arr) => arr.map((it, i) => (i === idx ? { ...it, amount: newVal } : it)));
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
            if (section === 'income') setIncome((arr) => arr.filter((_, i) => i !== idx));
            if (section === 'expenses') setExpenses((arr) => arr.filter((_, i) => i !== idx));
            if (section === 'savings') setSavings((arr) => arr.filter((_, i) => i !== idx));
          },
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <View
      className="flex-1 bg-backgroundDark"
      style={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom }}
    >
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="automatic"
        >
          {/* Header */}
          <Text className="text-textLight text-2xl font-extrabold mb-1">Planning</Text>
          <Text className="text-textLight/70 text-lg mb-4">{currentMonthYear}</Text>

          {/* Monthly Balance */}
          <View className="bg-surface p-4 rounded-2xl mb-4">
            <Text className="text-textLight text-base font-semibold mb-3">Monthly Balance</Text>

            <View className="flex-row justify-between mb-1">
              <Text className="text-white/70">Income</Text>
              <Text className="text-textLight">{formatKr(incomeTotal)} kr</Text>
            </View>
            <View className="flex-row justify-between mb-1">
              <Text className="text-white/70">Expenses</Text>
              <Text className="text-textLight">{formatKr(expenseTotal)} kr</Text>
            </View>
            <View className="flex-row justify-between mb-3">
              <Text className="text-white/70">Savings</Text>
              <Text className="text-textLight">{formatKr(savingsTotal)} kr</Text>
            </View>

            <View className="h-px bg-divider mb-3" />

            <View className="flex-row justify-between mb-1">
              <Text className="text-white/90 font-semibold">After Expenses</Text>
              <Text className={`${balanceColor} font-bold`}>
                {formatKr(afterExpenses)} kr
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-white/90 font-semibold">Leftover (after Expenses & Savings)</Text>
              <Text className={`${leftoverColor} font-bold`}>
                {formatKr(leftover)} kr
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
            onDeleteItem={deleteItemFactory('income')}
          />
          <Section
            title="Expenses"
            colorClass="text-expenses"
            items={expenses}
            onAddPress={() => openAdd('expenses')}
            onEditAmount={editAmountFactory('expenses')}
            onDeleteItem={deleteItemFactory('expenses')}
          />
          <Section
            title="Savings"
            colorClass="text-savings"
            items={savings}
            onAddPress={() => openAdd('savings')}
            onEditAmount={editAmountFactory('savings')}
            onDeleteItem={deleteItemFactory('savings')}
          />

          <TouchableOpacity className="bg-income p-4 rounded-2xl mt-2">
            <Text className="text-white text-center font-bold">Save Budget</Text>
          </TouchableOpacity>
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
