import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from './src/lib/firebase';

async function deduplicateProducts() {
  console.log('Fetching products...');
  const snapshot = await getDocs(collection(db, 'fuelsuite_products'));
  const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  const seenNames = new Set<string>();
  const duplicates: string[] = [];

  for (const product of products) {
    const name = ((product as any).name || '').trim().toLowerCase();
    if (seenNames.has(name)) {
      duplicates.push(product.id);
    } else {
      seenNames.add(name);
    }
  }

  console.log(`Found ${duplicates.length} duplicates.`);
  for (const id of duplicates) {
    console.log(`Deleting duplicate product id: ${id}`);
    await deleteDoc(doc(db, 'fuelsuite_products', id));
  }
  console.log('Deduplication complete.');
}

deduplicateProducts().catch(console.error);
