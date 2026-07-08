const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const { readFileSync } = require('fs');

let testEnv;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-hostel-manager',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

describe('Firestore Rules Schema Validation', () => {
  
  it('Allows valid tenant creation', async () => {
    const alice = testEnv.authenticatedContext('alice');
    await assertSucceeds(
      alice.firestore().collection('tenants').doc('tenant1').set({
        ownerId: 'alice',
        name: 'John Doe',
        phone: '1234567890'
      })
    );
  });

  it('Denies tenant creation with massive string (buffer overflow attempt)', async () => {
    const alice = testEnv.authenticatedContext('alice');
    const massiveString = 'A'.repeat(5000); // Exceeds 150 limit
    await assertFails(
      alice.firestore().collection('tenants').doc('tenant2').set({
        ownerId: 'alice',
        name: massiveString,
        phone: '1234567890'
      })
    );
  });

  it('Denies tenant creation with incorrect data type (null name)', async () => {
    const alice = testEnv.authenticatedContext('alice');
    await assertFails(
      alice.firestore().collection('tenants').doc('tenant3').set({
        ownerId: 'alice',
        name: null,
        phone: '1234567890'
      })
    );
  });

  it('Denies tenant creation with incorrect data type (number for name)', async () => {
    const alice = testEnv.authenticatedContext('alice');
    await assertFails(
      alice.firestore().collection('tenants').doc('tenant4').set({
        ownerId: 'alice',
        name: 12345,
        phone: '1234567890'
      })
    );
  });

  it('Allows valid block creation', async () => {
    const owner = testEnv.authenticatedContext('owner1');
    await assertSucceeds(
      owner.firestore().collection('blocks').doc('block1').set({
        ownerId: 'owner1',
        name: 'Block A',
        floors: 3
      })
    );
  });

  it('Denies block creation with incorrect data type for floors (string instead of number)', async () => {
    const owner = testEnv.authenticatedContext('owner1');
    await assertFails(
      owner.firestore().collection('blocks').doc('block2').set({
        ownerId: 'owner1',
        name: 'Block A',
        floors: '3' // Invalid type
      })
    );
  });

  it('Allows valid transaction creation', async () => {
    const owner = testEnv.authenticatedContext('owner1');
    await assertSucceeds(
      owner.firestore().collection('transactions').doc('tx1').set({
        ownerId: 'owner1',
        amount: 1500,
        type: 'rent'
      })
    );
  });

  it('Denies transaction creation with incorrect data type for amount (string)', async () => {
    const owner = testEnv.authenticatedContext('owner1');
    await assertFails(
      owner.firestore().collection('transactions').doc('tx2').set({
        ownerId: 'owner1',
        amount: '1500', // Invalid type
        type: 'rent'
      })
    );
  });
});
