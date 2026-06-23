import React, { useState, useContext } from 'react';
import { View, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Text, TextInput, Button, Chip, Appbar, SegmentedButtons } from 'react-native-paper';
import { useHostel } from '../../context/HostelContext';

const AddNotice = ({ navigation }) => {
const { addNotice } = useHostel();  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [priority, setPriority] = useState('Low');
  const [loading, setLoading] = useState(false); // Add loading state

  const categories = ['Maintenance', 'Payment', 'Event', 'Holiday', 'General'];

  const handlePost = async () => {
    if (!title || !description) {
      Alert.alert('Error', 'Please fill in the title and description.');
      return;
    }

    setLoading(true);

    try {
      // Create the notice data (ID and timestamp are handled by Context/Firebase now)
      const noticeData = {
        title,
        description,
        priority,
        type: category,
        // formatted string for quick UI display (optional, but keeps your current UI intact)
        displayDate: `Posted: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`,
      };

      await addNotice(noticeData); // Push to Firebase
      navigation.goBack();
      
    } catch (error) {
      Alert.alert("Error", "Could not post notice. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Compose Notice" />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>Notice Title</Text>
        <TextInput
          mode="outlined"
          placeholder="e.g., Water Supply Interrupt"
          value={title}
          onChangeText={setTitle}
          style={styles.input}
        />

        <Text style={styles.label}>Category</Text>
        <View style={styles.chipRow}>
            {categories.map((cat) => (
                <Chip 
                    key={cat} 
                    selected={category === cat} 
                    onPress={() => setCategory(cat)}
                    showSelectedOverlay
                    style={styles.chip}
                >
                    {cat}
                </Chip>
            ))}
        </View>

        <Text style={styles.label}>Priority Level</Text>
        <SegmentedButtons
          value={priority}
          onValueChange={setPriority}
          buttons={[
            { value: 'Low', label: 'Low', icon: 'check-circle-outline' },
            { value: 'Medium', label: 'Medium', icon: 'alert-circle-outline' },
            { value: 'High', label: 'High', icon: 'alert-octagon', checkedColor: '#D32F2F' },
          ]}
          style={styles.segment}
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          mode="outlined"
          placeholder="Enter full details here..."
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={6}
          style={styles.textArea}
        />

        <Button 
            mode="contained" 
            onPress={handlePost} 
            style={styles.button}
            contentStyle={{ height: 50 }}
            disabled={loading}
        >
            {loading ? <ActivityIndicator color="#fff" /> : "Post Notice"}
        </Button>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { backgroundColor: '#fff', elevation: 0 },
  content: { padding: 20 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#616161', marginBottom: 8, marginTop: 12 },
  input: { backgroundColor: '#fff', marginBottom: 8 },
  textArea: { backgroundColor: '#fff', marginBottom: 24 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: { marginRight: 4, marginBottom: 4 },
  segment: { marginBottom: 8 },
  button: { marginTop: 12, borderRadius: 8, backgroundColor: '#6200EE' },
});

export default AddNotice;