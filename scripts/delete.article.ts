// ═══════════════════════════════════════════════════════════════
// scripts/delete-article.ts - POISTA ARTIKKELI
// ═══════════════════════════════════════════════════════════════

import { deleteArticle } from '../lib/knowledge/ingestion';

async function main() {
  const sourceToDelete = 'Yle Uutiset';
  
  console.log(`🗑️ Deleting: ${sourceToDelete}`);
  
  const success = await deleteArticle(sourceToDelete);
  
  if (success) {
    console.log('✅ Deleted successfully');
  } else {
    console.log('❌ Delete failed');
  }
}

main().catch(console.error);

// Suorita: npx ts-node scripts/delete-article.ts