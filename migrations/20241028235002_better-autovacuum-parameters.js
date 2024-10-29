/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.raw(`
    alter table campaign_contact set (autovacuum_vacuum_scale_factor = 0, autovacuum_vacuum_threshold = 20000);
    alter table message set (autovacuum_vacuum_scale_factor = 0, autovacuum_vacuum_threshold = 20000);
    alter table organization_contact set (autovacuum_vacuum_scale_factor = 0, autovacuum_vacuum_threshold = 20000);

    alter table public.campaign_contact set (fillfactor = 50);
    alter table public.message set (fillfactor = 50);
    alter table public.organization_contact set (fillfactor = 50);
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.raw(`
    alter table campaign_contact set (autovacuum_vacuum_scale_factor = 0.2, autovacuum_vacuum_threshold = 50);
    alter table message set (autovacuum_vacuum_scale_factor = 0.2, autovacuum_vacuum_threshold = 50);
    alter table organization_contact set (autovacuum_vacuum_scale_factor = 0.2, autovacuum_vacuum_threshold = 50);

    alter table public.campaign_contact set (fillfactor = 100);
    alter table public.message set (fillfactor = 100);
    alter table public.organization_contact set (fillfactor = 100);
  `);
};
