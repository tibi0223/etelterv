import { fetchReceptAlapanyagV2 } from '../src/services/database/fetchers';

(async () => {
  const alapanyagok = await fetchReceptAlapanyagV2();
  const dbs = alapanyagok.filter(a => (a['Mértékegység'] || '').toLowerCase() === 'db');
  const unique: Record<string, number> = {};
  dbs.forEach(a => {
    unique[a['Élelmiszerek']] = (unique[a['Élelmiszerek']] || 0) + 1;
  });
  console.log('Alapanyagok db mértékegységgel:');
  Object.entries(unique)
    .sort((a, b) => b[1] - a[1])
    .forEach(([name, count]) => {
      console.log(`${name}: ${count} receptben`);
    });
})(); 