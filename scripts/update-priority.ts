// ═══════════════════════════════════════════════════════════════
// scripts/update-priority.ts - MUUTA PRIORITEETTIA
// ═══════════════════════════════════════════════════════════════

import { updatePriority } from '../lib/knowledge/ingestion';

async function main() {
  // Muuta "Yle Uutiset" artikkelin prioriteetti "high":ksi
  const success = await updatePriority('Yle Uutiset', 'high');
  
  if (success) {
    console.log('✅ Priority updated');
  } else {
    console.log('❌ Update failed');
  }
}

main().catch(console.error);

// Suorita: npx ts-node scripts/update-priority.ts