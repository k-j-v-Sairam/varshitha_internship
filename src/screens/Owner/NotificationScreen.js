import React, { useState } from 'react';
import { View, StyleSheet, SectionList, SafeAreaView, TouchableOpacity } from 'react-native';
import { Text, Surface, IconButton } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const NotificationScreen = ({ navigation }) => {
  
  // Mock Data - Grouped by timeline
  const [notifications, setNotifications] = useState([
    {
      title: 'Today',
      data: [
        { id: '1', type: 'payment', title: 'Rent Received', body: 'Rahul (Room 101) paid ₹5,000 via UPI.', time: '2 min ago', read: false },
        { id: '2', type: 'issue', title: 'Water Leakage', body: 'Reported in Block A, 2nd Floor washroom.', time: '1 hr ago', read: false },
      ]
    },
    {
      title: 'Yesterday',
      data: [
        { id: '3', type: 'staff', title: 'Staff Check-In', body: 'Ramesh (Cleaner) marked attendance.', time: '9:00 AM', read: true },
        { id: '4', type: 'general', title: 'Wifi Bill Due', body: 'Reminder to pay the monthly internet bill.', time: '2:30 PM', read: true },
      ]
    },
  ]);

  // Helper to get Icon based on type
  const getIcon = (type) => {
    switch(type) {
      case 'payment': return { name: 'cash-check', color: '#4CAF50', bg: '#E8F5E9' }; // Green
      case 'issue': return { name: 'alert-circle', color: '#F44336', bg: '#FFEBEE' }; // Red
      case 'staff': return { name: 'account-clock', color: '#2196F3', bg: '#E3F2FD' }; // Blue
      default: return { name: 'bell-ring', color: '#FF9800', bg: '#FFF3E0' }; // Orange
    }
  };

  const renderItem = ({ item }) => {
    const theme = getIcon(item.type);
    
    return (
      <Surface style={[styles.card, !item.read && styles.unreadBorder]} elevation={0}>
        <View style={styles.cardRow}>
          {/* Icon Box */}
          <View style={[styles.iconBox, { backgroundColor: theme.bg }]}>
            <Icon name={theme.name} size={24} color={theme.color} />
          </View>

          {/* Content */}
          <View style={styles.contentBox}>
            <View style={styles.titleRow}>
              <Text variant="titleSmall" style={styles.cardTitle}>{item.title}</Text>
              <Text variant="labelSmall" style={styles.timeText}>{item.time}</Text>
            </View>
            <Text variant="bodySmall" numberOfLines={2} style={styles.cardBody}>
              {item.body}
            </Text>
          </View>

          {/* Unread Dot */}
          {!item.read && <View style={styles.dot} />}
        </View>
      </Surface>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <Surface style={styles.header} elevation={1}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color="#333" />
          </TouchableOpacity>
          <Text variant="titleLarge" style={{fontWeight:'bold', color:'#333'}}>Notifications</Text>
        </View>
        
        {/* "Mark Read" Action */}
        <TouchableOpacity>
            <Text style={styles.markRead}>Mark all read</Text>
        </TouchableOpacity>
      </Surface>

      {/* List */}
      <SectionList
        sections={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        renderSectionHeader={({ section: { title } }) => (
          <Text style={styles.sectionHeader}>{title}</Text>
        )}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
            <View style={styles.emptyState}>
                <Icon name="bell-sleep" size={60} color="#E0E0E0" />
                <Text style={{color:'#9E9E9E', marginTop:10}}>No new notifications</Text>
            </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' }, // Light Grey BG
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  backButton: { marginRight: 20 },
  markRead: { color: '#004B8D', fontWeight: '600', fontSize: 13 },
  
  listContent: { padding: 16 },
  sectionHeader: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#757575',
    marginBottom: 10,
    marginTop: 15,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  
  // Card Styles
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    marginBottom: 12,
    padding: 15,
    // Soft Shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  unreadBorder: {
    borderLeftWidth: 4,
    borderLeftColor: '#004B8D'
  },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  iconBox: {
    width: 45,
    height: 45,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  contentBox: { flex: 1 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  cardTitle: { fontWeight: 'bold', color: '#333' },
  timeText: { color: '#9E9E9E', fontSize: 11 },
  cardBody: { color: '#616161', fontSize: 13, lineHeight: 18 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F44336', // Red dot for unread
    marginLeft: 10,
  },
  emptyState: { alignItems: 'center', marginTop: 100 }
});

export default NotificationScreen;