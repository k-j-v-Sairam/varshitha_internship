import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

/**
 * Records a financial transaction and updates the tenant's balance.
 * Used for charges and adjustments — not rent payments (see recordRentPayment in tenantService).
 */
export const recordTransaction = async ({ tenantId, amount, type, description }) => {
  const ownerId = auth().currentUser?.uid;
  const numAmount = Number(amount);

  await firestore().collection('transactions').add({
    tenantId,
    ownerId,
    amount: numAmount,
    type,
    description,
    date: firestore.FieldValue.serverTimestamp(),
  });

  const tenantRef = firestore().collection('tenants').doc(tenantId);
  const tenantDoc = await tenantRef.get();
  if (tenantDoc.exists) {
    const currentBalance = tenantDoc.data().balance || 0;
    const newBalance = type === 'Charge' ? currentBalance + numAmount : currentBalance - numAmount;
    await tenantRef.update({ balance: newBalance });
  }
};

export const fetchBlockExpenses = async (blockName, monthYear) => {
  const ownerId = auth().currentUser?.uid;
  if (!ownerId) return [];

  const snapshot = await firestore().collection('block_expenses')
    .where('ownerId', '==', ownerId)
    .where('blockName', '==', blockName)
    .where('monthYear', '==', monthYear)
    .orderBy('createdAt', 'desc')
    .get();

  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addBlockExpense = async (expenseData) => {
  const ownerId = auth().currentUser?.uid;
  await firestore().collection('block_expenses').add({
    ...expenseData,
    ownerId,
    createdAt: firestore.FieldValue.serverTimestamp(),
  });
};

export const saveBatchExpenses = async (expensesArray) => {
  const ownerId = auth().currentUser?.uid;
  const batch = firestore().batch();
  const collectionRef = firestore().collection('block_expenses');

  expensesArray.forEach(expense => {
    const docRef = collectionRef.doc();
    batch.set(docRef, {
      ...expense,
      ownerId,
      createdAt: firestore.FieldValue.serverTimestamp(),
    });
  });

  await batch.commit();
};

/**
 * FIX 4: deleteBlockExpense — was missing ownership check entirely.
 * Any authenticated user with a valid expenseId could delete any expense.
 * Now verifies ownership before deleting.
 */
export const deleteBlockExpense = async (expenseId) => {
  const ownerId = auth().currentUser?.uid;
  if (!ownerId) throw new Error('Not authenticated');

  const expenseRef = firestore().collection('block_expenses').doc(expenseId);
  const expenseDoc = await expenseRef.get();

  if (!expenseDoc.exists) throw new Error('Expense not found');

  // Security check: verify this expense belongs to the current owner
  if (expenseDoc.data().ownerId !== ownerId) {
    throw new Error('Unauthorized: this expense does not belong to you');
  }

  await expenseRef.delete();
};

/**
 * Fetch global and block-level finances.
 * Uses plain .get() queries computed in JS to avoid composite index requirements
 * for aggregate queries with != operator. This is more robust across all environments.
 */
export const getMasterFinances = async (monthYear) => {
  const ownerId = auth().currentUser?.uid;
  if (!ownerId) throw new Error('Not authenticated');

  // 1. Fetch all data in parallel
  const [blocksSnap, tenantsSnap, expensesSnap, staffSnap, txSnap] = await Promise.all([
    firestore().collection('blocks').where('ownerId', '==', ownerId).get(),
    firestore().collection('tenants').where('ownerId', '==', ownerId).get(),
    firestore().collection('block_expenses')
      .where('ownerId', '==', ownerId)
      .where('monthYear', '==', monthYear)
      .get(),
    firestore().collection('staff').where('ownerId', '==', ownerId).get(),
    firestore().collection('transactions')
      .where('ownerId', '==', ownerId)
      .where('monthYear', '==', monthYear)
      .where('type', '==', 'Payment')
      .get(),
  ]);

  const blocks = blocksSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  const tenants = tenantsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  const expenses = expensesSnap.docs.map(doc => doc.data());
  const staff = staffSnap.docs.map(doc => doc.data());
  const transactions = txSnap.docs.map(doc => doc.data());

  // Helper to check if tenant was active during this month
  const [mStr, yStr] = monthYear.split('-');
  const queryMonth = parseInt(mStr, 10) - 1; // 0-11
  const queryYear = parseInt(yStr, 10);
  const queryDateEnd = new Date(queryYear, queryMonth + 1, 0); // Last day of the month

  const parseJoinDate = (dateStr) => {
    if (!dateStr) return new Date(2000, 0, 1);
    const d = new Date(dateStr);
    return isNaN(d) ? new Date() : d;
  };

  const activeTenantsForMonth = tenants.filter(t => {
     if (t.rentStatus === 'Unassigned') return false;
     const joinD = parseJoinDate(t.joined);
     return joinD <= queryDateEnd;
  });

  // 2. Global totals
  const totalExpectedRev = activeTenantsForMonth.reduce((sum, t) => sum + Number(t.agreedRent || 0), 0);
  
  // Paid Revenue strictly comes from explicitly recorded transactions for this monthYear
  const paidRevenue = transactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  
  const totalPending = Math.max(0, totalExpectedRev - paidRevenue);

  const totalManualExp = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const totalStaffExp = staff.reduce((sum, s) => sum + Number(s.salary || 0), 0);
  const totalExp = totalManualExp + totalStaffExp;

  // 3. Block-level breakdown
  const blockStats = blocks.map(block => {
    const blockName = block.name;

    const blockTenants = activeTenantsForMonth.filter(t => t.blockId === blockName);
    const expectedRev = blockTenants.reduce((sum, t) => sum + Number(t.agreedRent || 0), 0);

    const blockTx = transactions.filter(tx => {
       const t = tenants.find(tenant => tenant.id === tx.tenantId);
       return t && t.blockId === blockName;
    });
    const collectedRev = blockTx.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

    const blockExpenses = expenses.filter(e => e.blockName === blockName);
    const manualExp = blockExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

    const blockStaff = staff.filter(s => s.block === blockName);
    const staffExp = blockStaff.reduce((sum, s) => sum + Number(s.salary || 0), 0);

    const exp = manualExp + staffExp;
    
    return { 
      name: blockName, 
      revenue: expectedRev, // Expected
      collectedRevenue: collectedRev,
      expense: exp, 
      profit: collectedRev - exp,
      expenseDetails: blockExpenses, // Specific manual expenses
      staffDetails: blockStaff,      // Specific staff
      tenantDetails: blockTenants,   // Specific active tenants
      transactionsDetails: blockTx   // Specific payments for the month
    };
  });

  blockStats.sort((a, b) => b.revenue - a.revenue);

  return {
    globalStats: {
      revenue: totalExpectedRev, // Expected
      paidRevenue,               // Collected
      expense: totalExp,
      pending: totalPending,
      profit: paidRevenue - totalExp,
    },
    blockStats,
  };
};
