// src/screens/Owner/OwnerMessMenuScreen.js
// Dynamic mess/cafeteria menu management for Owner.
// Owner can add/edit/delete dishes and timings per block.

import React, { useState, useEffect } from 'react';
import {
  View, StyleSheet, ScrollView, TouchableOpacity, StatusBar,
  Alert, ActivityIndicator, Modal, TextInput as RNTextInput, KeyboardAvoidingView, Platform
} from 'react-native';
import { Text, Button, Surface } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import auth from '@react-native-firebase/auth';
import { getMessMenu, saveMessMenu, DAYS, MEALS } from '../../services/messService';
import { Colors } from '../../theme/colors';

const PRIMARY = Colors.primary || '#4338CA';

const MEAL_CONFIG = [
  { key: 'Breakfast', icon: 'weather-sunny', color: '#F59E0B', bg: '#FEF3C7' },
  { key: 'Lunch', icon: 'weather-partly-cloudy', color: '#3B82F6', bg: '#DBEAFE' },
  { key: 'Snacks', icon: 'food-apple', color: '#8B5CF6', bg: '#EDE9FE' },
  { key: 'Dinner', icon: 'weather-night', color: '#0D9488', bg: '#CCFBF1' },
];

export default function OwnerMessMenuScreen({ route, navigation }) {
  const { blockId, blockName } = route.params || {};
  const ownerId = auth().currentUser?.uid;

  const [menuData, setMenuData] = useState(null);
  const [menu, setMenu] = useState({}); // { [day]: { [meal]: string } }
  const [timings, setTimings] = useState({}); // { [meal]: string }
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDay, setSelectedDay] = useState(DAYS[0]);
  const [hasChanges, setHasChanges] = useState(false);

  // Edit modal
  const [editModal, setEditModal] = useState(false);
  const [editMeal, setEditMeal] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [editTiming, setEditTiming] = useState('');

  useEffect(() => {
    if (!ownerId || !blockId) {
      setLoading(false);
      return;
    }
    const unsub = getMessMenu(ownerId, blockId, (data) => {
      setMenuData(data);
      if (data) {
        setMenu(data.menu || {});
        setTimings(data.timings || {});
      }
      setLoading(false);
    });
    return () => unsub();
  }, [ownerId, blockId]);

  const openEdit = (meal) => {
    setEditMeal(meal);
    setEditValue(menu[selectedDay]?.[meal.key] || '');
    setEditTiming(timings[meal.key] || '');
    setEditModal(true);
  };

  const saveEdit = () => {
    const newMenu = { ...menu };
    newMenu[selectedDay] = { ...(newMenu[selectedDay] || {}) };
    newMenu[selectedDay][editMeal.key] = editValue.trim();

    const newTimings = { ...timings };
    if (editTiming.trim()) newTimings[editMeal.key] = editTiming.trim();
    else delete newTimings[editMeal.key];

    setMenu(newMenu);
    setTimings(newTimings);
    setHasChanges(true);
    setEditModal(false);
    setEditMeal(null);
    setEditValue('');
    setEditTiming('');
  };

  const clearMealItem = (mealKey) => {
    Alert.alert(
      'Clear Meal',
      `Remove "${mealKey}" from ${selectedDay}'s menu?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            const newMenu = { ...menu };
            if (newMenu[selectedDay]) {
              delete newMenu[selectedDay][mealKey];
            }
            setMenu(newMenu);
            setHasChanges(true);
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    if (!blockId || !ownerId) return;
    setSaving(true);
    try {
      await saveMessMenu({
        blockId,
        blockName: blockName || blockId,
        menu,
        timings,
      });
      setHasChanges(false);
      Alert.alert('✅ Saved!', `Mess menu for Block ${blockId} has been updated.`);
    } catch {
      Alert.alert('Error', 'Could not save menu. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const currentDayMenu = menu[selectedDay] || {};

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#3730A3" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Mess Menu Editor</Text>
          <Text style={styles.headerSub}>Block {blockId || '—'} · {blockName || ''}</Text>
        </View>
        {hasChanges && (
          <View style={styles.unsavedChip}>
            <Text style={styles.unsavedText}>Unsaved</Text>
          </View>
        )}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={PRIMARY} style={{ marginTop: 60 }} />
      ) : (
        <>
          {/* Day Selector */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.dayScrollOuter}
            contentContainerStyle={styles.dayScrollContent}
          >
            {DAYS.map(day => (
              <TouchableOpacity
                key={day}
                style={[styles.dayTab, selectedDay === day && styles.dayTabActive]}
                onPress={() => setSelectedDay(day)}
              >
                <Text style={[styles.dayTabShort, selectedDay === day && styles.dayTabShortActive]}>
                  {day.slice(0, 3)}
                </Text>
                <Text style={[styles.dayTabFull, selectedDay === day && styles.dayTabFullActive]}>
                  {day}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

            <View style={styles.dayHeaderRow}>
              <MaterialCommunityIcons name="calendar-today" size={16} color={PRIMARY} />
              <Text style={styles.dayHeaderText}>{selectedDay} — tap a meal to edit</Text>
            </View>

            {/* Meal Cards */}
            {MEAL_CONFIG.map(meal => {
              const mealText = currentDayMenu[meal.key];
              const timing = timings[meal.key];
              const hasMeal = !!mealText;

              return (
                <TouchableOpacity key={meal.key} activeOpacity={0.7} onPress={() => openEdit(meal)}>
                  <Surface style={styles.mealCard} elevation={1}>
                    <View style={[styles.mealIconBox, { backgroundColor: meal.bg }]}>
                      <MaterialCommunityIcons name={meal.icon} size={26} color={meal.color} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 14 }}>
                      <View style={styles.mealCardTop}>
                        <Text style={styles.mealName}>{meal.key}</Text>
                        {timing && (
                          <View style={[styles.timingChip, { backgroundColor: meal.bg }]}>
                            <MaterialCommunityIcons name="clock-outline" size={11} color={meal.color} />
                            <Text style={[styles.timingText, { color: meal.color }]}>{timing}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.mealContent, !hasMeal && styles.mealContentEmpty]}>
                        {mealText || 'Not set — tap to add'}
                      </Text>
                    </View>
                    <View style={styles.mealActions}>
                      <View style={[styles.mealActionBtn, { backgroundColor: meal.bg }]}>
                        <MaterialCommunityIcons name="pencil" size={17} color={meal.color} />
                      </View>
                      {hasMeal && (
                        <TouchableOpacity style={styles.mealClearBtn} onPress={(e) => { e.stopPropagation(); clearMealItem(meal.key); }}>
                          <MaterialCommunityIcons name="close-circle" size={17} color="#CBD5E1" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </Surface>
                </TouchableOpacity>
              );
            })}

            {/* Save Button */}
            <Button
              mode="contained"
              onPress={handleSave}
              loading={saving}
              disabled={saving || !hasChanges}
              buttonColor={PRIMARY}
              style={styles.saveBtn}
              contentStyle={{ height: 52 }}
              labelStyle={{ fontSize: 16, fontWeight: 'bold', letterSpacing: 0.3 }}
              icon="content-save"
            >
              {hasChanges ? 'Save Menu Changes' : 'No Changes to Save'}
            </Button>

            <View style={styles.tip}>
              <MaterialCommunityIcons name="information-outline" size={14} color="#94A3B8" />
              <Text style={styles.tipText}>
                Timings apply to all days. Tap any meal card to edit the dish and timing.
              </Text>
            </View>
          </ScrollView>
        </>
      )}

      {/* Edit Modal */}
      <Modal visible={editModal} animationType="slide" transparent onRequestClose={() => setEditModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>
                  Edit {editMeal?.key}
                </Text>
                <Text style={styles.modalSub}>{selectedDay}</Text>
              </View>
              <TouchableOpacity onPress={() => setEditModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Dishes / Menu Items</Text>
            <RNTextInput
              style={styles.textInput}
              value={editValue}
              onChangeText={setEditValue}
              placeholder="e.g. Idli, Vada, Sambar, Chutney"
              multiline
              numberOfLines={3}
              placeholderTextColor="#CBD5E1"
            />

            <Text style={styles.inputLabel}>Timing (optional)</Text>
            <RNTextInput
              style={[styles.textInput, { height: 48 }]}
              value={editTiming}
              onChangeText={setEditTiming}
              placeholder="e.g. 7:00 AM - 9:00 AM"
              placeholderTextColor="#CBD5E1"
            />

            <View style={styles.modalActions}>
              <Button
                mode="outlined"
                onPress={() => setEditModal(false)}
                style={{ flex: 1, borderRadius: 10 }}
                textColor="#64748B"
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={saveEdit}
                buttonColor={PRIMARY}
                style={{ flex: 1, borderRadius: 10 }}
                contentStyle={{ height: 44 }}
                labelStyle={{ fontWeight: 'bold' }}
              >
                Save
              </Button>
            </View>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    backgroundColor: PRIMARY,
    paddingTop: 52,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  unsavedChip: { backgroundColor: '#FEF3C7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  unsavedText: { fontSize: 11, fontWeight: '700', color: '#D97706' },
  dayScrollOuter: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  dayScrollContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 6, flexDirection: 'row' },
  dayTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  dayTabActive: { backgroundColor: PRIMARY },
  dayTabShort: { fontSize: 10, fontWeight: '600', color: '#94A3B8' },
  dayTabShortActive: { color: 'rgba(255,255,255,0.8)' },
  dayTabFull: { fontSize: 13, fontWeight: '700', color: '#475569' },
  dayTabFullActive: { color: '#fff' },
  dayHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 14 },
  dayHeaderText: { fontSize: 14, fontWeight: '600', color: PRIMARY },
  scroll: { padding: 16, paddingBottom: 40 },
  mealCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  mealIconBox: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  mealCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  mealName: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  timingChip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
  timingText: { fontSize: 10, fontWeight: '700' },
  mealContent: { fontSize: 13, color: '#475569', lineHeight: 20 },
  mealContentEmpty: { color: '#CBD5E1', fontStyle: 'italic' },
  mealActions: { flexDirection: 'column', gap: 6, marginLeft: 10, alignItems: 'center' },
  mealActionBtn: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  mealClearBtn: { width: 34, height: 34, justifyContent: 'center', alignItems: 'center' },
  saveBtn: { borderRadius: 14, marginTop: 20, elevation: 3 },
  tip: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 16, backgroundColor: '#F1F5F9', padding: 12, borderRadius: 10 },
  tipText: { fontSize: 12, color: '#94A3B8', flex: 1, lineHeight: 18 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#0F172A' },
  modalSub: { fontSize: 13, color: '#94A3B8', marginTop: 2 },
  inputLabel: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 6 },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
});
