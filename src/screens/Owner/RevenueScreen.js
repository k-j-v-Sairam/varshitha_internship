import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Card, Avatar, IconButton, useTheme, Surface } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const RevenueScreen = ({ navigation }) => {
  const theme = useTheme();

  // Mock Data (We will replace this with real DB data later)
  const financialData = {
    netProfit: '₹1,42,800',
    revenue: '₹15,200',
    expense: '₹1,58,000', // This seems high in your ref, but keeping it dynamic
    profitTrend: '+12.5%',
    pendingRent: '₹6,800'
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <Surface style={styles.header} elevation={2}>
        <View style={styles.headerRow}>
          <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
          <Text variant="titleLarge" style={styles.headerTitle}>Financial Hub</Text>
        </View>
      </Surface>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* 1. HERO CARD: PROFITS (Matches your 'Profits' wireframe button) */}
        <Card style={styles.heroCard}>
            <View style={styles.heroBackground}>
                <View>
                    <Text style={styles.heroLabel}>Net Profit (Current Month)</Text>
                    <Text style={styles.heroAmount}>{financialData.netProfit}</Text>
                    <View style={styles.trendBadge}>
                        <MaterialCommunityIcons name="trending-up" size={16} color="#4CAF50" />
                        <Text style={styles.trendText}> {financialData.profitTrend} from last month</Text>
                    </View>
                </View>
                <Avatar.Icon size={56} icon="chart-line" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
            </View>
        </Card>

        {/* 2. SPLIT SECTION: EXPENDITURE & EARNINGS (Matches your 2nd & 3rd wireframe buttons) */}
        <View style={styles.row}>
            
            {/* Expenditure Card - Click to go to Expenditure Screen */}
            <TouchableOpacity 
                style={styles.halfCardContainer} 
                onPress={() => navigation.navigate('Expenditure')} // Navigates to the screen in your wireframe
            >
                <Card style={[styles.statCard, { borderLeftColor: '#F44336' }]}>
                    <Card.Content>
                        <View style={styles.iconCircleRed}>
                            <MaterialCommunityIcons name="cash-minus" size={24} color="#F44336" />
                        </View>
                        <Text variant="labelMedium" style={styles.statLabel}>Total Expenditure</Text>
                        <Text variant="titleLarge" style={styles.statAmount}>{financialData.expense}</Text>
                        <Text style={styles.tapHint}>Tap to view details ›</Text>
                    </Card.Content>
                </Card>
            </TouchableOpacity>

            {/* Earnings Card */}
            <TouchableOpacity style={styles.halfCardContainer}>
                <Card style={[styles.statCard, { borderLeftColor: '#4CAF50' }]}>
                    <Card.Content>
                        <View style={styles.iconCircleGreen}>
                            <MaterialCommunityIcons name="cash-plus" size={24} color="#4CAF50" />
                        </View>
                        <Text variant="labelMedium" style={styles.statLabel}>Total Earnings</Text>
                        <Text variant="titleLarge" style={styles.statAmount}>{financialData.revenue}</Text>
                        <Text style={styles.tapHint}>Tap to view history ›</Text>
                    </Card.Content>
                </Card>
            </TouchableOpacity>
        </View>

        {/* 3. QUICK STATS (Like the Web Reference 'Pending' & 'Overdue') */}
        <Text variant="titleMedium" style={styles.sectionTitle}>Quick Insights</Text>
        
        <View style={styles.insightRow}>
            <Card style={styles.insightCard}>
                <Card.Content style={styles.insightContent}>
                    <MaterialCommunityIcons name="alert-circle-outline" size={24} color="#FF9800" />
                    <View style={{ marginLeft: 12 }}>
                        <Text variant="labelSmall">Pending Rents</Text>
                        <Text variant="titleMedium" style={{ color: '#FF9800' }}>{financialData.pendingRent}</Text>
                    </View>
                </Card.Content>
            </Card>
        </View>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: { backgroundColor: '#fff', paddingVertical: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontWeight: 'bold' },
  content: { padding: 16 },
  
  // Hero Card
  heroCard: { backgroundColor: '#6200EE', borderRadius: 16, marginBottom: 20, elevation: 4 },
  heroBackground: { padding: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroLabel: { color: '#E0E0E0', fontSize: 14, marginBottom: 4 },
  heroAmount: { color: '#FFF', fontSize: 32, fontWeight: 'bold', marginBottom: 8 },
  trendBadge: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' },
  trendText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },

  // Split Cards
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  halfCardContainer: { width: '48%' },
  statCard: { backgroundColor: '#FFF', borderLeftWidth: 4, elevation: 2, borderRadius: 12 },
  iconCircleRed: { backgroundColor: '#FFEBEE', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  iconCircleGreen: { backgroundColor: '#E8F5E9', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  statLabel: { color: '#757575' },
  statAmount: { fontWeight: 'bold', marginTop: 4 },
  tapHint: { fontSize: 10, color: '#9E9E9E', marginTop: 8 },

  // Insights
  sectionTitle: { fontWeight: 'bold', marginBottom: 12, color: '#424242' },
  insightRow: { gap: 10 },
  insightCard: { backgroundColor: '#FFF', marginBottom: 10 },
  insightContent: { flexDirection: 'row', alignItems: 'center' }
});

export default RevenueScreen;