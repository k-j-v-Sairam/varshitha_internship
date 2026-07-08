// src/screens/Tenant/TenantMessMenuScreen.js
// Dynamic mess/cafeteria menu — fetched from Firestore, editable by Owner.

import React, { useState, useEffect } from 'react';
import {
  View, StyleSheet, ScrollView, StatusBar, ActivityIndicator, TouchableOpacity, RefreshControl
} from 'react-native';
import { Text, Surface } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTenantContext } from './TenantDashboard';
import { getMessMenuForTenant } from '../../services/messService';
import SkeletonLoader from '../../components/common/SkeletonLoader';

const TEAL = '#0D9488';
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MEALS = [
  { key: 'Breakfast', icon: 'weather-sunny', color: '#F59E0B', bg: '#FEF3C7' },
  { key: 'Lunch', icon: 'weather-partly-cloudy', color: '#3B82F6', bg: '#DBEAFE' },
  { key: 'Snacks', icon: 'food-apple', color: '#8B5CF6', bg: '#EDE9FE' },
  { key: 'Dinner', icon: 'weather-night', color: '#0D9488', bg: '#CCFBF1' },
];

const getCurrentDayName = () => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[new Date().getDay()];
};

export default function TenantMessMenuScreen() {
  const { tenantProfile } = useTenantContext();
  const [menuData, setMenuData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(getCurrentDayName());
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  useEffect(() => {
    if (!tenantProfile?.ownerId || !tenantProfile?.blockId) {
      setLoading(false);
      return;
    }
    const unsub = getMessMenuForTenant(tenantProfile.ownerId, tenantProfile.blockId, (data) => {
      setMenuData(data);
      setLoading(false);
    });
    return () => unsub();
  }, [tenantProfile?.ownerId, tenantProfile?.blockId]);

  const today = getCurrentDayName();
  const currentDayMenu = menuData?.menu?.[selectedDay] || {};
  const timings = menuData?.timings || {};

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F766E" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mess Menu 🍽️</Text>
        <Text style={styles.headerSub}>
          {menuData ? `Block ${tenantProfile?.blockId || ''} Weekly Schedule` : 'Weekly cafeteria schedule'}
        </Text>
      </View>

      {loading ? (
        <View style={{ padding: 20, gap: 16 }}>
          <SkeletonLoader width="100%" height={60} style={{ borderRadius: 12 }} />
          <SkeletonLoader width="100%" height={100} style={{ borderRadius: 16 }} />
          <SkeletonLoader width="100%" height={100} style={{ borderRadius: 16 }} />
          <SkeletonLoader width="100%" height={100} style={{ borderRadius: 16 }} />
        </View>
      ) : !menuData ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="silverware-variant" size={64} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>
            {!tenantProfile?.blockId ? 'No Block Assigned' : 'Menu Not Available'}
          </Text>
          <Text style={styles.emptySub}>
            {!tenantProfile?.blockId 
              ? 'You are not assigned to a block yet. Menus are block-specific.' 
              : "The hostel owner hasn't set up the mess menu for your block yet. Check back soon!"}
          </Text>
        </View>
      ) : (
        <ScrollView 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[TEAL]} />}
        >

          {/* Day Selector */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayScroll}>
            <View style={styles.dayRow}>
              {DAYS.map(day => {
                const isToday = day === today;
                const isSelected = day === selectedDay;
                return (
                  <View key={day} style={styles.dayWrapper}>
                    <Text style={styles.dayInitial}>{day.slice(0, 3)}</Text>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      style={[
                        styles.dayCircle,
                        isSelected && styles.dayCircleSelected,
                        isToday && !isSelected && styles.dayCircleToday,
                      ]}
                      onPress={() => setSelectedDay(day)}
                    >
                      <Text style={[
                        styles.dayCircleText,
                        isSelected && styles.dayCircleTextSelected,
                      ]}>{day.slice(0, 1)}</Text>
                    </TouchableOpacity>
                    {isToday && <View style={styles.todayDot} />}
                  </View>
                );
              })}
            </View>
          </ScrollView>

          {/* Selected Day Header */}
          <View style={styles.selectedDayHeader}>
            <Text style={styles.selectedDayTitle}>{selectedDay}</Text>
            {selectedDay === today && (
              <View style={styles.todayChip}>
                <MaterialCommunityIcons name="star" size={12} color={TEAL} />
                <Text style={styles.todayChipText}>Today</Text>
              </View>
            )}
          </View>

          {/* Meal Cards */}
          {MEALS.map(meal => {
            const mealText = currentDayMenu[meal.key];
            const timing = timings[meal.key];
            return (
              <Surface key={meal.key} style={styles.mealCard} elevation={1}>
                <View style={[styles.mealIcon, { backgroundColor: meal.bg }]}>
                  <MaterialCommunityIcons name={meal.icon} size={26} color={meal.color} />
                </View>
                <View style={styles.mealInfo}>
                  <View style={styles.mealHeader}>
                    <Text style={styles.mealName}>{meal.key}</Text>
                    {timing && (
                      <View style={[styles.timingChip, { backgroundColor: meal.bg }]}>
                        <MaterialCommunityIcons name="clock-outline" size={11} color={meal.color} />
                        <Text style={[styles.timingText, { color: meal.color }]}>{timing}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.mealItems}>
                    {mealText || 'Menu not specified'}
                  </Text>
                </View>
              </Surface>
            );
          })}

          <View style={styles.footerNote}>
            <MaterialCommunityIcons name="information-outline" size={15} color="#94A3B8" />
            <Text style={styles.footerNoteText}>
              Menu is subject to change. Contact warden for updates.
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0FDF4' },
  header: { backgroundColor: TEAL, paddingTop: 52, paddingBottom: 24, paddingHorizontal: 20 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  scroll: { paddingBottom: 40 },
  dayScroll: { backgroundColor: '#fff', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  dayRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8 },
  dayWrapper: { alignItems: 'center', gap: 4 },
  dayInitial: { fontSize: 10, fontWeight: '600', color: '#94A3B8' },
  dayCircle: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: '#F1F5F9',
    justifyContent: 'center', alignItems: 'center',
  },
  dayCircleSelected: { backgroundColor: TEAL },
  dayCircleToday: { borderWidth: 2, borderColor: TEAL },
  dayCircleText: { fontSize: 15, fontWeight: '700', color: '#475569' },
  dayCircleTextSelected: { color: '#fff' },
  todayDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: TEAL },
  selectedDayHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8, gap: 10 },
  selectedDayTitle: { fontSize: 20, fontWeight: 'bold', color: '#0F172A' },
  todayChip: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#CCFBF1', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  todayChipText: { fontSize: 11, fontWeight: '700', color: TEAL },
  mealCard: { 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    marginHorizontal: 16, 
    marginBottom: 10, 
    padding: 16, 
    flexDirection: 'row', 
    gap: 14, 
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  mealIcon: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  mealInfo: { flex: 1 },
  mealHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  mealName: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  timingChip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  timingText: { fontSize: 10, fontWeight: '700' },
  mealItems: { fontSize: 13, color: '#475569', lineHeight: 22, paddingTop: 4 },
  footerNote: { flexDirection: 'row', alignItems: 'center', gap: 6, margin: 16, backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12 },
  footerNoteText: { fontSize: 12, color: '#94A3B8', flex: 1 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12, marginTop: 60 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#64748B' },
  emptySub: { fontSize: 14, color: '#94A3B8', textAlign: 'center', lineHeight: 22 },
});
