import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, TextInput, Button, Chip, Appbar, SegmentedButtons } from 'react-native-paper';

const AddNotice = ({ navigation, route }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [priority, setPriority] = useState('Low');

  // Options for Chips
  const categories = ['Maintenance', 'Payment', 'Event', 'Holiday', 'General'];

  const handlePost = () => {
    if (!title || !description) {
      Alert.alert('Error', 'Please fill in the title and description.');
      return;
    }

    // Create the new notice object
    const newNotice = {
      id: Date.now().toString(), // Unique ID
      title,
      description,
      priority,
      type: category,
      date: `Posted: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`,
      active: true,
    };

    // Call the function passed from the previous screen
    if (route.params?.addNewNotice) {
        route.params.addNewNotice(newNotice);
    }

    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Compose Notice" />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Title Input */}
        <Text style={styles.label}>Notice Title</Text>
        <TextInput
          mode="outlined"
          placeholder="e.g., Water Supply Interrupt"
          value={title}
          onChangeText={setTitle}
          style={styles.input}
        />

        {/* Category Selection */}
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

        {/* Priority Selection */}
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

        {/* Description Input */}
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

        {/* Submit Button */}
        <Button 
            mode="contained" 
            onPress={handlePost} 
            style={styles.button}
            contentStyle={{ height: 50 }}
        >
            Post Notice
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