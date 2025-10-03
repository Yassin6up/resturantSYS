exports.seed = async function(knex) {
  await knex('tables').del();
  
  const tables = [];
  for (let i = 1; i <= 20; i++) {
    tables.push({
      branch_id: 1,
      table_number: `T${i}`,
      qr_code: `https://posq.local/menu?table=T${i}&branch=CAS`,
      description: `Table ${i} - Indoor`
    });
  }
  
  // Add some outdoor tables
  for (let i = 21; i <= 25; i++) {
    tables.push({
      branch_id: 1,
      table_number: `T${i}`,
      qr_code: `https://posq.local/menu?table=T${i}&branch=CAS`,
      description: `Table ${i} - Outdoor Terrace`
    });
  }
  
  return knex('tables').insert(tables);
};