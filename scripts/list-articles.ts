// ═══════════════════════════════════════════════════════════════
// scripts/list-articles.ts - LISTAA KAIKKI ARTIKKELIT
// ═══════════════════════════════════════════════════════════════

import { listArticles } from '../lib/knowledge/ingestion';

async function main() {
  console.log('📚 Listing all articles...\n');
  
  const articles = await listArticles();
  
  if (articles.length === 0) {
    console.log('No articles in knowledge base yet.');
    return;
  }
  
  articles.forEach((article, i) => {
    console.log(`${i + 1}. ${article.source}`);
    console.log(`   Type: ${article.content_type}`);
    console.log(`   Priority: ${article.priority}`);
    console.log(`   Language: ${article.language}`);
    console.log(`   Chunks: ${article.chunks}`);
    console.log(`   Topics: ${article.topics.join(', ')}`);
    console.log(`   Added: ${article.createdAt}`);
    console.log('');
  });
  
  console.log(`Total: ${articles.length} articles`);
}

main().catch(console.error);

// Suorita: npx ts-node scripts/list-articles.ts


