import { useEffect, useRef } from 'react';
import notifee, { AndroidImportance } from '@notifee/react-native';
import firestore from '@react-native-firebase/firestore';

// Initialize Notifee Channels
export async function setupNotifications() {
  await notifee.requestPermission();
  await notifee.createChannel({
    id: 'tenant-updates',
    name: 'Tenant Updates',
    importance: AndroidImportance.HIGH,
  });
}

// Hook to listen for Tenant updates and trigger local notifications
export function useTenantNotifications(tenantProfile) {
  const isFirstLoadComplaints = useRef(true);
  const isFirstLoadTransactions = useRef(true);

  useEffect(() => {
    setupNotifications();
  }, []);

  useEffect(() => {
    if (!tenantProfile?.id) return;

    // Listen to Complaints for this tenant
    const unsubComplaints = firestore()
      .collection('complaints')
      .where('tenantId', '==', tenantProfile.id)
      .onSnapshot(snapshot => {
        if (!snapshot) return;

        if (isFirstLoadComplaints.current) {
          isFirstLoadComplaints.current = false;
          return; // Skip initial load
        }

        snapshot.docChanges().forEach(async (change) => {
          if (change.type === 'modified') {
            const data = change.doc.data();
            await notifee.displayNotification({
              title: 'Complaint Update',
              body: `Your complaint "${data.title}" status changed to ${data.status}.`,
              android: {
                channelId: 'tenant-updates',
                smallIcon: 'ic_launcher', // Use default launcher icon
                pressAction: { id: 'default' },
              },
            });
          }
        });
      }, err => {
        console.log('Error listening to complaints:', err);
      });

    // Listen to Rent Transactions (if owner adds a payment)
    const unsubTransactions = firestore()
      .collection('transactions')
      .where('tenantId', '==', tenantProfile.id)
      .onSnapshot(snapshot => {
        if (!snapshot) return;

        if (isFirstLoadTransactions.current) {
          isFirstLoadTransactions.current = false;
          return;
        }

        snapshot.docChanges().forEach(async (change) => {
          if (change.type === 'added') {
            const data = change.doc.data();
            if (data.amount) {
              await notifee.displayNotification({
                title: 'Payment Recorded',
                body: `A payment of ₹${data.amount} has been recorded by the owner.`,
                android: {
                  channelId: 'tenant-updates',
                  smallIcon: 'ic_launcher',
                  pressAction: { id: 'default' },
                },
              });
            }
          }
        });
      }, err => {
        console.log('Error listening to transactions:', err);
      });

    return () => {
      unsubComplaints();
      unsubTransactions();
    };
  }, [tenantProfile?.id]);
}
