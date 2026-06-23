import React, { useState, useContext, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Text, Card, Button, IconButton, Appbar, Searchbar } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useHostel } from '../../context/HostelContext';
const NoticeBoardScreen = ({ navigation }) => {
  // Pull data and functions directly from Context!
const { notices, fetchNotices, deleteNotice } = useHostel();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All'); 

  // Fetch notices when screen mounts
  useEffect(() => {
    fetchNotices();
  }, []);

  const handleDelete = (id) => {
    Alert.alert(
        "Delete Notice",
        "Are you sure you want to remove this?",
        [
            { text: "Cancel", style: "cancel" },
            { 
                text: "Delete", 
                style: "destructive", 
                onPress: () => deleteNotice(id) // Call context function
            }
        ]
    );
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High': return '#D32F2F'; 
      case 'Medium': return '#FB8C00'; 
      default: return '#388E3C'; 
    }
  };

  // --- Filtering Logic (Uses Context data now) ---
  const filteredNotices = notices.filter((n) => {
    const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          n.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesCategory = true;
    if (activeFilter === 'High') matchesCategory = n.priority === 'High';
    if (activeFilter === 'Event') matchesCategory = n.type === 'Event' || n.type === 'Holiday';
    if (activeFilter === 'Payment') matchesCategory = n.type === 'Payment'; 

    return matchesSearch && matchesCategory;
  });

  const activeCount = notices.length;
  const highCount = notices.filter(n => n.priority === 'High').length;
  const holidayCount = notices.filter(n => n.type === 'Event' || n.type === 'Holiday').length;
  const reminderCount = notices.filter(n => n.type === 'Payment').length;

  const StatCard = ({ icon, count, label, color, filterKey }) => {
    const isActive = activeFilter === filterKey;
    return (
      <TouchableOpacity 
        style={[styles.statCard, isActive && styles.statCardActive]} 
        onPress={() => setActiveFilter(filterKey)}
      >
        <View style={[styles.iconBox, { backgroundColor: color + '20' }]}>
          <MaterialCommunityIcons name={icon} size={24} color={color} />
        </View>
        <View>
          <Text style={styles.statCount}>{count}</Text>
          <Text style={styles.statLabel}>{label}</Text>
        </View>
        {isActive && (
             <View style={{ position: 'absolute', top: 8, right: 8 }}>
                 <MaterialCommunityIcons name="check-circle" size={16} color={color} />
             </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Notices & Alerts" titleStyle={styles.headerTitle} />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.content}>
        <Searchbar
          placeholder="Search notices..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          inputStyle={{ fontSize: 14 }}
        />

        <Button 
          mode="contained" 
          icon="plus" 
          style={styles.createButton}
          contentStyle={{ height: 48 }}
          labelStyle={{ fontSize: 16, fontWeight: 'bold' }}
          // Notice we don't pass `addNewNotice` in params anymore!
          onPress={() => navigation.navigate('AddNotice')} 
        >
          New Notice
        </Button>

        <View style={styles.statsGrid}>
            <StatCard icon="bell-ring" count={activeCount} label="All Active" color="#2196F3" filterKey="All" />
            <StatCard icon="alert-circle" count={highCount} label="High Prio" color="#D32F2F" filterKey="High" />
            <StatCard icon="calendar-check" count={holidayCount} label="Holidays" color="#4CAF50" filterKey="Event" />
            <StatCard icon="clock-outline" count={reminderCount} label="Reminders" color="#FF9800" filterKey="Payment" />
        </View>

        <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>
                {activeFilter === 'All' ? 'Recent Announcements' : `Filtered: ${activeFilter}`}
            </Text>
            {activeFilter !== 'All' && (
                <TouchableOpacity onPress={() => setActiveFilter('All')}>
                    <Text style={{ color: '#2962FF', fontSize: 12 }}>Clear Filter</Text>
                </TouchableOpacity>
            )}
        </View>

        {filteredNotices.length === 0 ? (
            <View style={{ alignItems: 'center', marginTop: 40 }}>
                <MaterialCommunityIcons name="clipboard-text-off-outline" size={48} color="#ddd" />
                <Text style={{ color: '#999', marginTop: 10 }}>No notices found.</Text>
            </View>
        ) : (
            filteredNotices.map((item) => (
                <Card key={item.id} style={styles.noticeCard}>
                    <View style={styles.cardHeader}>
                        <View style={styles.headerLeft}>
                            <View style={[styles.typeIcon, { backgroundColor: getPriorityColor(item.priority) + '15' }]}>
                                <MaterialCommunityIcons 
                                    name={item.priority === 'High' ? 'alert' : 'information'} 
                                    size={20} 
                                    color={getPriorityColor(item.priority)} 
                                />
                            </View>
                            
                            <View style={{ marginLeft: 10, flex: 1 }}>
                                <Text style={styles.noticeTitle}>{item.title}</Text>
                                
                                <View style={styles.chipContainer}>
                                    <View style={[styles.chipBase, { backgroundColor: getPriorityColor(item.priority) + '20' }]}>
                                        <Text style={[styles.chipText, { color: getPriorityColor(item.priority) }]}>{item.priority}</Text>
                                    </View>
                                    
                                    <View style={[styles.chipBase, { backgroundColor: '#F5F5F5' }]}>
                                        <Text style={[styles.chipText, { color: '#616161' }]}>{item.type}</Text>
                                    </View>
                                </View>
                            </View>
                        </View>

                        <IconButton 
                            icon="delete-outline" 
                            size={20} 
                            iconColor="#9E9E9E" 
                            style={{ margin: 0 }}
                            onPress={() => handleDelete(item.id)} 
                        />
                    </View>

                    <Card.Content>
                        <Text style={styles.description}>{item.description}</Text>
                        <View style={styles.cardFooter}>
                            <MaterialCommunityIcons name="clock-time-four-outline" size={14} color="#9E9E9E" />
                            {/* Uses the displayDate we generated during upload */}
                            <Text style={styles.dateText}> {item.displayDate || 'Recently'}</Text>
                        </View>
                    </Card.Content>
                </Card>
            ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: { backgroundColor: '#FAFAFA', elevation: 0 },
  headerTitle: { fontWeight: 'bold', fontSize: 20 },
  content: { padding: 16 },

  searchBar: { marginBottom: 16, backgroundColor: '#fff', borderRadius: 12, elevation: 2, height: 46 },
  createButton: { backgroundColor: '#2962FF', borderRadius: 12, marginBottom: 20, elevation: 4 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 },
  statCard: { 
      width: '48%', 
      backgroundColor: '#fff', 
      borderRadius: 12, 
      padding: 12, 
      marginBottom: 12, 
      flexDirection: 'row', 
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'transparent',
      elevation: 2 
  },
  statCardActive: { borderColor: '#2962FF', backgroundColor: '#F0F5FF' },
  
  iconBox: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  statCount: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  statLabel: { fontSize: 12, color: '#757575' },

  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#424242' },

  noticeCard: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 16, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 12, paddingBottom: 0 },
  headerLeft: { flexDirection: 'row', flex: 1, paddingRight: 4 },
  typeIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  noticeTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 6 },
  
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chipBase: { 
      paddingHorizontal: 8, 
      paddingVertical: 4, 
      borderRadius: 6, 
      justifyContent: 'center', 
      alignItems: 'center' 
  },
  chipText: { fontSize: 10, fontWeight: '600' },

  description: { fontSize: 14, color: '#616161', marginTop: 8, lineHeight: 20 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F5F5F5' },
  dateText: { fontSize: 12, color: '#9E9E9E' }
});

export default NoticeBoardScreen;